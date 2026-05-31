#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/blkdev.h>
#include <linux/blk-mq.h>
#include <linux/bio.h>
#include <linux/version.h>
#include <linux/vmalloc.h>
#include <linux/spinlock.h>
#include <linux/string.h>
#include <linux/highmem.h>
#include <linux/minmax.h>

#define DEVICE_NAME "index_block"
#define NSECTORS    1024

#define EXPECTED_NAME "Kamil Suchy"
#define INDEX_NUMBER "60859\n"
#define INVALID_TEXT "Niepoprawne dane\n"

struct index_block_dev {
    unsigned long size;
    u8 *data;
    spinlock_t lock;
    struct request_queue *queue;
    struct gendisk *gd;
    struct blk_mq_tag_set tag_set;
};

static struct index_block_dev ib_dev;
static int major_num;

static void store_response(struct index_block_dev *dev, const char *response)
{
    memset(dev->data, 0, dev->size);
    strscpy(dev->data, response, dev->size);
}

static void process_input(struct index_block_dev *dev, const char *input, size_t len)
{
    char buf[128];
    size_t copy_len = min(len, sizeof(buf) - 1);
    char *trimmed;

    memcpy(buf, input, copy_len);
    buf[copy_len] = '\0';

    trimmed = strim(buf);
    if (strcmp(trimmed, EXPECTED_NAME) == 0)
        store_response(dev, INDEX_NUMBER);
    else
        store_response(dev, INVALID_TEXT);
}

static blk_status_t index_block_queue_rq(struct blk_mq_hw_ctx *hctx,
                                         const struct blk_mq_queue_data *bd)
{
    struct request *req = bd->rq;
    struct index_block_dev *dev = req->q->queuedata;
    sector_t sector = blk_rq_pos(req);
    unsigned long offset = (unsigned long)sector * SECTOR_SIZE;
    unsigned long bytes = blk_rq_bytes(req);
    unsigned long start_offset = offset;
    bool is_write = rq_data_dir(req) == WRITE;
    struct bio_vec bvec;
    struct req_iterator iter;
    blk_status_t status = BLK_STS_OK;

    blk_mq_start_request(req);

    if (req_op(req) != REQ_OP_READ && req_op(req) != REQ_OP_WRITE) {
        status = BLK_STS_IOERR;
        goto out;
    }

    if (offset + bytes > dev->size) {
        status = BLK_STS_IOERR;
        goto out;
    }

    spin_lock(&dev->lock);
    rq_for_each_segment(bvec, req, iter) {
        void *page_mem = kmap_atomic(bvec.bv_page);
        char *buffer = (char *)page_mem + bvec.bv_offset;
        unsigned int len = bvec.bv_len;

        if (is_write)
            memcpy(dev->data + offset, buffer, len);
        else
            memcpy(buffer, dev->data + offset, len);

        kunmap_atomic(page_mem);
        offset += len;
    }

    if (is_write && start_offset == 0)
        process_input(dev, dev->data, min(bytes, dev->size));

    spin_unlock(&dev->lock);

out:
    blk_mq_end_request(req, status);
    return status;
}

static const struct blk_mq_ops index_block_mq_ops = {
    .queue_rq = index_block_queue_rq,
};

static const struct block_device_operations index_block_fops = {
    .owner = THIS_MODULE,
};

static int __init index_block_init(void)
{
    int ret;

    ib_dev.size = NSECTORS * SECTOR_SIZE;
    spin_lock_init(&ib_dev.lock);

    ib_dev.data = vmalloc(ib_dev.size);
    if (!ib_dev.data)
        return -ENOMEM;
    memset(ib_dev.data, 0, ib_dev.size);

    major_num = register_blkdev(0, DEVICE_NAME);
    if (major_num < 0) {
        vfree(ib_dev.data);
        return major_num;
    }

    ib_dev.tag_set.ops = &index_block_mq_ops;
    ib_dev.tag_set.nr_hw_queues = 1;
    ib_dev.tag_set.queue_depth = 128;
    ib_dev.tag_set.numa_node = NUMA_NO_NODE;
    ib_dev.tag_set.cmd_size = 0;
#ifdef BLK_MQ_F_SHOULD_MERGE
    ib_dev.tag_set.flags = BLK_MQ_F_SHOULD_MERGE;
#else
    ib_dev.tag_set.flags = 0;
#endif
    ib_dev.tag_set.driver_data = &ib_dev;

    ret = blk_mq_alloc_tag_set(&ib_dev.tag_set);
    if (ret)
        goto err_blkdev;

    ib_dev.gd = alloc_disk(1);
    if (!ib_dev.gd) {
        ret = -ENOMEM;
        goto err_tag_set;
    }

    ib_dev.queue = blk_mq_init_queue(&ib_dev.tag_set);
    if (IS_ERR(ib_dev.queue)) {
        ret = PTR_ERR(ib_dev.queue);
        goto err_disk;
    }
    ib_dev.queue->queuedata = &ib_dev;
    ib_dev.gd->queue = ib_dev.queue;

    ib_dev.gd->major = major_num;
    ib_dev.gd->first_minor = 0;
    ib_dev.gd->minors = 1;
    ib_dev.gd->fops = &index_block_fops;
    ib_dev.gd->private_data = &ib_dev;
    snprintf(ib_dev.gd->disk_name, 32, "%s", DEVICE_NAME);
    set_capacity(ib_dev.gd, NSECTORS);

    add_disk(ib_dev.gd);

    return 0;

err_disk:
    put_disk(ib_dev.gd);
err_tag_set:
    blk_mq_free_tag_set(&ib_dev.tag_set);
err_blkdev:
    unregister_blkdev(major_num, DEVICE_NAME);
    vfree(ib_dev.data);
    return ret;
}

static void __exit index_block_exit(void)
{
    del_gendisk(ib_dev.gd);
    put_disk(ib_dev.gd);
    blk_cleanup_queue(ib_dev.queue);
    blk_mq_free_tag_set(&ib_dev.tag_set);
    unregister_blkdev(major_num, DEVICE_NAME);
    vfree(ib_dev.data);
}

module_init(index_block_init);
module_exit(index_block_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik blokowy zwracający numer indeksu");