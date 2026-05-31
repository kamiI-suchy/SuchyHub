const TASKS = [
  {
    id: 17,
    title: "Modul jadra – hello printk",
    desc: "Prosty modul jadra Linux wyswietlajacy personalia przez printk.",
    pdf: "zadanie17/lab17.pdf",
    uruchomienie: "zadanie17/uruchomienie.txt",
    needsFields: { albumNumber: true, fullName: true, initials: false },
    files: [
      {
        name: "hello_printk.c",
        type: "text",
        template: `/*
 * "Hello, world!" minimal kernel module
 *
 * Valerie Henson <val@nmt.edu>
 *
 */

/*
 * The below are header files provided by the kernel which are
 * required for all modules.  They include things like the definition
 * of the module_init() macro.
 */
#include <linux/init.h>
#include <linux/module.h>

/*
 * This is the init function, which is run when the module is first
 * loaded.  The __init keyword tells the kernel that this code will
 * only be run once, when the module is loaded.
 */

static int __init
hello_init(void)
{
\tprintk("__NAME__\\n");
\treturn 0;
}

/*
 * The below macro informs the kernel as to which function to use as
 * the init function.
 */

module_init(hello_init);

/*
 * Similary, the exit function is run once, upon module unloading, and
 * the module_exit() macro identifies which function is the exit
 * function.
 */

static void __exit
hello_exit(void)
{
\tprintk("__ALBUM__\\n");
}

module_exit(hello_exit);

/*
 * MODULE_LICENSE() informs the kernel what license the module source
 * code is under, which affects which symbols it may access in the
 * main kernel.  Certain module licenses will "taint" the kernel,
 * indicating that non-open or untrusted code has been loaded.
 * Modules licensed under GPLv2 do not taint the kernel and can access
 * all symbols, but declaring it so is a legal statement that the
 * source code to this module is licensed under GPLv2, and so you must
 * provide the source code if you ship a binary version of the module.
 */
MODULE_LICENSE("GPL");
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("\\"Hello, world!\\" minimal module");
MODULE_VERSION("printk");`
      }
    ],
    downloads: []
  },
  {
    id: 18,
    title: "Sterowanie LED przez sysfs – kod Morse'a",
    desc: "Program migajacy dioda LED kodem Morse'a na podstawie inicjalow studenta.",
    pdf: "zadanie18/lab18.pdf",
    uruchomienie: "zadanie18/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: false, initials: true },
    files: [
      {
        name: "prog.c",
        type: "morse_full",
        template: `#include <stdio.h>
#include <unistd.h>
#include <signal.h>
#include <stdlib.h>
#include <stdbool.h>

static FILE *trigger = NULL;
static FILE *brightness = NULL;
static volatile sig_atomic_t keep_running = 1;

static void handle_sigint(int sig) {
\t(void)sig;
\tkeep_running = 0;
}

static void safe_usleep(unsigned usec) {
\tconst unsigned SLICE = 100000;
\twhile (usec > 0 && keep_running) {
\t\tunsigned slice = (usec > SLICE) ? SLICE : usec;
\t\tusleep(slice);
\t\tusec -= slice;
\t}
}

int main() {
\ttrigger = fopen("/sys/class/leds/beaglebone:green:usr3/trigger", "w");
\tbrightness = fopen("/sys/class/leds/beaglebone:green:usr3/brightness", "w");

\tif (!trigger || !brightness) {
\t\tperror("Blad otwarcia plikow sysfs");
\t\treturn 1;
\t}

\tsignal(SIGINT, handle_sigint);

\tfprintf(trigger, "none\\n");
\tfflush(trigger);

__MORSE_LOOP_FULL__

\tfprintf(brightness, "0\\n");
\tfflush(brightness);
\tfclose(brightness);
\tfclose(trigger);
\treturn 0;
}`
      },
      {
        name: "prog_krotki.c",
        type: "morse_short",
        template: `#include <stdio.h>
#include <unistd.h>

int main() {
\tFILE * trigger    = fopen("/sys/class/leds/beaglebone:green:usr3/trigger",    "w");
\tFILE * brightness = fopen("/sys/class/leds/beaglebone:green:usr3/brightness", "w");

\tfprintf(trigger, "none\\n");
\tfflush(trigger);

__MORSE_LOOP_SHORT__

\treturn 0;
}`
      }
    ],
    downloads: []
  },
  {
    id: 19,
    title: "Sterownik GPIO (sysfs) – miganie LED",
    desc: "Program migajacy naprzemiennie czerwona i zielona dioda LED przez GPIO sysfs.",
    pdf: "zadanie19/lab19.pdf",
    uruchomienie: "zadanie19/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: false, initials: false },
    files: [
      {
        name: "prog.c",
        type: "static",
        template: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <signal.h>
#include <stdbool.h>

#define LED_RED "66"
#define LED_GREEN "67"

#define GPIO_PATH "/sys/class/gpio"
#define EXPORT_PATH GPIO_PATH "/export"
#define UNEXPORT_PATH GPIO_PATH "/unexport"
#define DIRECTION_PATH GPIO_PATH "/gpio%s/direction"
#define VALUE_PATH GPIO_PATH "/gpio%s/value"

#define BLINK_DURATION 10
#define BLINK_INTERVAL 500000

static volatile sig_atomic_t keep_running = 1;

static void write_sysfs(const char *path, const char *value) {
\tint fd = open(path, O_WRONLY);
\tif (fd < 0) {
\t\tperror("Nie mozna otworzyc pliku sysfs");
\t\texit(1);
\t}
\tif (write(fd, value, strlen(value)) != (ssize_t)strlen(value)) {
\t\tperror("Nie mozna zapisac do pliku sysfs");
\t\tclose(fd);
\t\texit(1);
\t}
\tclose(fd);
}

static void safe_usleep(unsigned usec) {
\tconst unsigned SLICE = 100000;
\twhile (usec > 0 && keep_running) {
\t\tunsigned slice = (usec > SLICE) ? SLICE : usec;
\t\tusleep(slice);
\t\tusec -= slice;
\t}
}

static void handle_sigint(int sig) {
\t(void)sig;
\tkeep_running = 0;
}

int main() {
\tchar path[128];

\tsignal(SIGINT, handle_sigint);

\twrite_sysfs(EXPORT_PATH, LED_RED);
\twrite_sysfs(EXPORT_PATH, LED_GREEN);

\tsnprintf(path, sizeof(path), DIRECTION_PATH, LED_RED);
\twrite_sysfs(path, "out");
\tsnprintf(path, sizeof(path), DIRECTION_PATH, LED_GREEN);
\twrite_sysfs(path, "out");

\tint cycles = (BLINK_DURATION * 1000000) / (2 * BLINK_INTERVAL);

\tfor (int i = 0; i < cycles && keep_running; i++) {
\t\tsnprintf(path, sizeof(path), VALUE_PATH, LED_RED);
\t\twrite_sysfs(path, "1");
\t\tsnprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
\t\twrite_sysfs(path, "0");
\t\tsafe_usleep(BLINK_INTERVAL);

\t\tsnprintf(path, sizeof(path), VALUE_PATH, LED_RED);
\t\twrite_sysfs(path, "0");
\t\tsnprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
\t\twrite_sysfs(path, "1");
\t\tsafe_usleep(BLINK_INTERVAL);
\t}

\tsnprintf(path, sizeof(path), VALUE_PATH, LED_RED);
\twrite_sysfs(path, "0");
\tsnprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
\twrite_sysfs(path, "0");

\twrite_sysfs(UNEXPORT_PATH, LED_RED);
\twrite_sysfs(UNEXPORT_PATH, LED_GREEN);

\treturn 0;
}`
      }
    ],
    downloads: []
  },
  {
    id: 20,
    title: "Sterownik GPIO (sysfs) – odczyt przyciskow",
    desc: "Program odczytujacy stan przyciskow (zolty i niebieski) przez GPIO sysfs.",
    pdf: "zadanie20/lab20.pdf",
    uruchomienie: "zadanie20/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: false, initials: false },
    files: [
      {
        name: "prog.c",
        type: "static",
        template: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <signal.h>
#include <stdbool.h>

#define BUTTON_YELLOW   "68"
#define BUTTON_BLUE     "69"

#define GPIO_PATH       "/sys/class/gpio"
#define EXPORT_PATH     GPIO_PATH "/export"
#define UNEXPORT_PATH   GPIO_PATH "/unexport"
#define DIRECTION_PATH  GPIO_PATH "/gpio%s/direction"
#define VALUE_PATH      GPIO_PATH "/gpio%s/value"

#define READ_INTERVAL   500000

static volatile sig_atomic_t keep_running = 1;

static void handle_sigint(int sig) {
    (void)sig;
    keep_running = 0;
}

static void write_sysfs(const char *path, const char *value) {
    int fd = open(path, O_WRONLY);
    if (fd < 0) {
        perror("Nie mozna otworzyc pliku do zapisu");
        exit(EXIT_FAILURE);
    }
    if (write(fd, value, strlen(value)) != (ssize_t)strlen(value)) {
        perror("Nie mozna zapisac do pliku");
        close(fd);
        exit(EXIT_FAILURE);
    }
    close(fd);
}

static void safe_usleep(unsigned usec) {
    const unsigned SLICE = 100000;
    while (usec > 0 && keep_running) {
        unsigned slice = (usec > SLICE) ? SLICE : usec;
        usleep(slice);
        usec -= slice;
    }
}

static char read_sysfs_value(const char *path) {
    char buf[2] = {0};
    int fd = open(path, O_RDONLY);
    if (fd < 0) {
        perror("Nie mozna otworzyc pliku do odczytu");
        exit(EXIT_FAILURE);
    }
    if (read(fd, buf, 1) != 1) {
        perror("Blad odczytu z pliku");
        close(fd);
        exit(EXIT_FAILURE);
    }
    close(fd);
    return buf[0];
}

int main(void) {
    char path[128];

    signal(SIGINT, handle_sigint);

    write_sysfs(EXPORT_PATH, BUTTON_YELLOW);
    write_sysfs(EXPORT_PATH, BUTTON_BLUE);

    snprintf(path, sizeof(path), DIRECTION_PATH, BUTTON_YELLOW);
    write_sysfs(path, "in");
    snprintf(path, sizeof(path), DIRECTION_PATH, BUTTON_BLUE);
    write_sysfs(path, "in");

    printf("Monitorowanie przyciskow (GPIO%s - zolty, GPIO%s - niebieski).\\n",
           BUTTON_YELLOW, BUTTON_BLUE);
    printf("Wcisnij Ctrl+C, aby zakonczyc.\\n\\n");

    while (keep_running) {
        char yellow_state, blue_state;

        snprintf(path, sizeof(path), VALUE_PATH, BUTTON_YELLOW);
        yellow_state = read_sysfs_value(path);

        snprintf(path, sizeof(path), VALUE_PATH, BUTTON_BLUE);
        blue_state = read_sysfs_value(path);

        printf("Zolty: %c  |  Niebieski: %c\\n", yellow_state, blue_state);
        fflush(stdout);

        safe_usleep(READ_INTERVAL);
    }

    printf("\\nZakonczono monitorowanie. Czyszczenie GPIO...\\n");

    write_sysfs(UNEXPORT_PATH, BUTTON_YELLOW);
    write_sysfs(UNEXPORT_PATH, BUTTON_BLUE);

    return 0;
}`
      }
    ],
    downloads: []
  },
  {
    id: 21,
    title: "Sterownik znakowy LED",
    desc: "Sterownik znakowy (character device) sterujacy LED na podstawie inicjalow.",
    pdf: "zadanie21/lab21.pdf",
    uruchomienie: "zadanie21/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: true, initials: true },
    files: [
      {
        name: "led_char.c",
        type: "text",
        template: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>
#include <linux/io.h>
#include <linux/ctype.h>
#include <linux/minmax.h>

#define DEVICE_NAME "bbb_led_char"
#define CLASS_NAME "bbb_led"

#define GPIO_ADDR_BASE              0x4804C000
#define ADDR_SIZE                   0x1000
#define GPIO_SETDATAOUT_OFFSET      0x194
#define GPIO_CLEARDATAOUT_OFFSET    0x190
#define GPIO_OE_OFFSET              0x134

#define LED_PIN                     24
#define LED_MASK                    (1U << LED_PIN)

static void __iomem *base_addr;
static dev_t dev_number;
static struct cdev led_cdev;
static struct class *led_class;

static void led_on(void)
{
\twritel_relaxed(LED_MASK, base_addr + GPIO_SETDATAOUT_OFFSET);
}

static void led_off(void)
{
\twritel_relaxed(LED_MASK, base_addr + GPIO_CLEARDATAOUT_OFFSET);
}

static int led_hw_init(void)
{
\tu32 reg;

\tbase_addr = ioremap(GPIO_ADDR_BASE, ADDR_SIZE);
\tif (!base_addr)
\t\treturn -ENOMEM;

\treg = readl_relaxed(base_addr + GPIO_OE_OFFSET);
\treg &= ~LED_MASK;
\twritel_relaxed(reg, base_addr + GPIO_OE_OFFSET);

\tled_off();
\treturn 0;
}

static void led_hw_exit(void)
{
\tu32 reg;

\tif (!base_addr)
\t\treturn;

\tled_off();
\treg = readl_relaxed(base_addr + GPIO_OE_OFFSET);
\treg |= LED_MASK;
\twritel_relaxed(reg, base_addr + GPIO_OE_OFFSET);

\tiounmap(base_addr);
\tbase_addr = NULL;
}

static int led_open(struct inode *inode __maybe_unused, struct file *file __maybe_unused)
{
\treturn 0;
}

static int led_release(struct inode *inode __maybe_unused, struct file *file __maybe_unused)
{
\treturn 0;
}

static bool is_initial(char ch)
{
\tch = toupper(ch);
\treturn ch == '__INITIAL1__' || ch == '__INITIAL2__';
}

static ssize_t led_write(struct file *file __maybe_unused, const char __user *buf,
\t\t\t  size_t count, loff_t *ppos __maybe_unused)
{
\tchar kbuf[128];
\tsize_t len;
\tsize_t i;
\tbool saw_alpha = false;
\tbool matched = false;

\tif (count == 0)
\t\treturn 0;

\tlen = min(count, sizeof(kbuf) - 1);
\tif (copy_from_user(kbuf, buf, len))
\t\treturn -EFAULT;

\tkbuf[len] = '\\0';

\tfor (i = 0; i < len; i++) {
\t\tif (!isalpha(kbuf[i]))
\t\t\tcontinue;
\t\tsaw_alpha = true;
\t\tif (is_initial(kbuf[i])) {
\t\t\tmatched = true;
\t\t\tbreak;
\t\t}
\t}

\tif (matched)
\t\tled_on();
\telse if (saw_alpha)
\t\tled_off();

\treturn count;
}

static const struct file_operations led_fops = {
\t.owner = THIS_MODULE,
\t.open = led_open,
\t.release = led_release,
\t.write = led_write,
};

static int __init led_char_init(void)
{
\tint ret;
\tstruct device *device;

\tret = led_hw_init();
\tif (ret)
\t\treturn ret;

\tret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
\tif (ret)
\t\tgoto err_hw;

\tcdev_init(&led_cdev, &led_fops);
\tret = cdev_add(&led_cdev, dev_number, 1);
\tif (ret)
\t\tgoto err_chrdev;

\tled_class = class_create(THIS_MODULE, CLASS_NAME);
\tif (IS_ERR(led_class)) {
\t\tret = PTR_ERR(led_class);
\t\tgoto err_cdev;
\t}

\tdevice = device_create(led_class, NULL, dev_number, NULL, DEVICE_NAME);
\tif (IS_ERR(device)) {
\t\tret = PTR_ERR(device);
\t\tgoto err_class;
\t}

\treturn 0;

err_class:
\tclass_destroy(led_class);
err_cdev:
\tcdev_del(&led_cdev);
err_chrdev:
\tunregister_chrdev_region(dev_number, 1);
err_hw:
\tled_hw_exit();
\treturn ret;
}

static void __exit led_char_exit(void)
{
\tdevice_destroy(led_class, dev_number);
\tclass_destroy(led_class);
\tcdev_del(&led_cdev);
\tunregister_chrdev_region(dev_number, 1);
\tled_hw_exit();
}

module_init(led_char_init);
module_exit(led_char_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("Sterownik znakowy do sterowania LED na BBB");`
      },
      {
        name: "hello_led.c",
        type: "text",
        template: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/io.h>
#include <linux/delay.h>

#define GPIO_ADDR_BASE              0x4804C000
#define ADDR_SIZE                   0X1000
#define GPIO_SETDATAOUT_OFFSET      0X194
#define GPIO_CLEARDATAOUT_OFFSET    0X190
#define GPIO_OE_OFFSET              0X134
#define GPIO_DATAIN_OFFSET          0X138

#define GPIO_IRQSTATUS_RAW_0_OFFSET 0X24
#define GPIO_IRQSTATUS_SET_0_OFFSET 0X34
#define GPIO_RISINGDETECT_OFFSET    0X148
#define GPIO_DEBOUNCENABLE_OFFSET   0X150
#define GPIO_DEBOUNCINGTIME_OFFSET  0X154

#define LED_VALUE_0                 ~(1 << 24)
#define LED_VALUE_1                  (1 << 24)

void __iomem *base_addr;

int init_module(void)
{
    printk(KERN_EMERG "Hello");

    base_addr = ioremap(GPIO_ADDR_BASE, ADDR_SIZE);

    writel_relaxed(LED_VALUE_0, base_addr + GPIO_OE_OFFSET);
    writel_relaxed(LED_VALUE_1, base_addr + GPIO_SETDATAOUT_OFFSET);

    return 0;
}

void cleanup_module(void)
{
    printk(KERN_EMERG "Goodbye");

    writel_relaxed(LED_VALUE_1, base_addr + GPIO_CLEARDATAOUT_OFFSET);
    writel_relaxed(LED_VALUE_1, base_addr + GPIO_CLEARDATAOUT_OFFSET);
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("Hello world kernel module");`
      }
    ],
    downloads: []
  },
  {
    id: 22,
    title: "Sterownik blokowy",
    desc: "Sterownik blokowy zwracajacy numer indeksu po podaniu prawidlowego imienia i nazwiska.",
    pdf: "zadanie22/zad22.pdf",
    uruchomienie: "zadanie22/uruchomienie.txt",
    needsFields: { albumNumber: true, fullName: true, initials: false },
    files: [
      {
        name: "index_block.c",
        type: "text",
        template: `#include <linux/module.h>
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

#define EXPECTED_NAME "__NAME__"
#define INDEX_NUMBER "__ALBUM__\\n"
#define INVALID_TEXT "Niepoprawne dane\\n"

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
    buf[copy_len] = '\\0';

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
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("Sterownik blokowy zwracajacy numer indeksu");`
      }
    ],
    downloads: []
  },
  {
    id: 23,
    title: "USB – libftdi1 i ft232r_prog",
    desc: "Odczyt konfiguracji ukladu FT232R (ft232r_prog) oraz unikalnego ID (libftdi1).",
    pdf: "zadanie23/lab23.pdf",
    uruchomienie: "zadanie23/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: false, initials: false },
    files: [],
    downloads: [
      { name: "ft232r_prog-1.25.tar.gz", path: "zadanie23/ft232r_prog-1.25.tar.gz" },
      { name: "libftdi1-1.5.tar.bz2 (glowne)", path: "zadanie23/libftdi1-1.5.tar.bz2" },
      { name: "libftdi1-1.5.tar.bz2 (oryginalneArchiwum)", path: "zadanie23/oryginalneArchiwum/libftdi1-1.5.tar.bz2" }
    ]
  },
  {
    id: 24,
    title: "USB – libftdi1 bitbang CBUS",
    desc: "Sterowanie czterema diodami LED przez FTDI CBUS bitbang z poziomu klawiatury.",
    pdf: "zadanie24/lab24.pdf",
    uruchomienie: "zadanie24/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: false, initials: false },
    files: [
      {
        name: "bitbang_cbus.c",
        type: "static",
        template: `#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <ftdi.h>

static struct termios orig_termios;

static void disable_raw_mode(void)
{
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
}

static void enable_raw_mode(void)
{
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);
    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

static void print_leds(unsigned char state)
{
    const int led_bits[4] = {0, 1, 3, 2};

    printf("\\rLEDy: ");
    for (int i = 0; i < 4; i++) {
        const char *status = ((state >> led_bits[i]) & 1) ? "OFF" : "ON ";
        printf("[LED%d:%s] ", i + 1, status);
    }
    fflush(stdout);
}

int main(void)
{
    struct ftdi_context *ftdi;
    int f;
    unsigned char state = 0x0F;

    if ((ftdi = ftdi_new()) == 0) {
        fprintf(stderr, "ftdi_new failed\\n");
        return EXIT_FAILURE;
    }

    f = ftdi_usb_open(ftdi, 0x0403, 0x6001);
    if (f < 0 && f != -5) {
        fprintf(stderr, "unable to open ftdi device: %d (%s)\\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_free(ftdi);
        exit(-1);
    }
    printf("ftdi open succeeded: %d\\n", f);

    f = ftdi_set_bitmode(ftdi, 0xF0 | state, BITMODE_CBUS);
    if (f < 0) {
        fprintf(stderr, "set_bitmode failed, error %d (%s)\\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_usb_close(ftdi);
        ftdi_free(ftdi);
        exit(-1);
    }

    printf("\\nSterowanie LEDami (aktywne niskim stanem):\\n");
    printf("  1 2 3 4  – wlacz LED\\n");
    printf("  q w e r  – wylacz LED\\n");
    printf("  ESC / x  – wyjscie\\n\\n");
    print_leds(state);

    enable_raw_mode();

    while (1) {
        char c;
        if (read(STDIN_FILENO, &c, 1) != 1) break;

        unsigned char prev = state;

        switch (c) {
        case '1': state &= ~0x01; break;
        case '2': state &= ~0x02; break;
        case '3': state &= ~0x08; break;
        case '4': state &= ~0x04; break;

        case 'q': state |=  0x01; break;
        case 'w': state |=  0x02; break;
        case 'e': state |=  0x08; break;
        case 'r': state |=  0x04; break;

        case 27:
        case 'x': disable_raw_mode();
                  printf("\\nKoniec.\\n");
                  goto cleanup;
        default:  break;
        }

        if (state != prev) {
            unsigned char mask = 0xF0 | state;
            f = ftdi_set_bitmode(ftdi, mask, BITMODE_CBUS);
            if (f < 0) {
                fprintf(stderr, "\\nset_bitmode failed, error %d (%s)\\n",
                        f, ftdi_get_error_string(ftdi));
                disable_raw_mode();
                goto cleanup;
            }
            print_leds(state);
        }
    }

    disable_raw_mode();
cleanup:
    printf("\\ndisabling bitbang mode\\n");
    ftdi_disable_bitbang(ftdi);
    ftdi_usb_close(ftdi);
    ftdi_free(ftdi);

    return 0;
}`
      }
    ],
    downloads: [
      { name: "libftdi1-1.5.tar.bz2 (glowne)", path: "zadanie24/libftdi1-1.5.tar.bz2" },
      { name: "libftdi1-1.5.tar.bz2 (oryginalneArchiwum)", path: "zadanie24/oryginalneArchiwum/libftdi1-1.5.tar.bz2" }
    ]
  },
  {
    id: 25,
    title: "Sterownik – obsluga przerwan",
    desc: "Sterownik obslugujacy przerwania od przyciskow GPIO68 (zolty) i GPIO69 (niebieski).",
    pdf: "zadanie25/zad25.pdf",
    uruchomienie: "zadanie25/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: true, initials: false },
    files: [
      {
        name: "interrupt_buttons.c",
        type: "text",
        template: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/gpio.h>
#include <linux/interrupt.h>
#include <linux/io.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("Sterownik przerwan dla przyciskow GPIO68 (zolty) i GPIO69 (niebieski)");

#define GPIO2_START_ADDR        0x481AC000
#define GPIO2_SIZE              0x1000

#define CM_PER_START_ADDR       0x44E00000
#define CM_PER_SIZE             0x400
#define CM_PER_GPIO2_CLKCTRL    0xB0

#define BUTTON_YELLOW           68
#define BUTTON_BLUE             69

#define PIN_YELLOW_MASK         (1 << 4)
#define PIN_BLUE_MASK           (1 << 5)

static int irq_yellow;
static int irq_blue;

static irqreturn_t button_yellow_isr(int irq, void *dev_id)
{
\tprintk(KERN_INFO "Wcisniety przycisk GPIO68 (zolty)\\n");
\treturn IRQ_HANDLED;
}

static irqreturn_t button_blue_isr(int irq, void *dev_id)
{
\tprintk(KERN_INFO "Wcisniety przycisk GPIO69 (niebieski)\\n");
\treturn IRQ_HANDLED;
}

static int __init interrupt_init(void)
{
\tint ret;
\tvoid __iomem *mem;
\tvoid __iomem *cm_per;

\tprintk(KERN_INFO "Ladowanie modulu przerwan...\\n");

\tcm_per = ioremap(CM_PER_START_ADDR, CM_PER_SIZE);
\tif (!cm_per) {
\t\tprintk(KERN_ERR "Blad ioremap CM_PER\\n");
\t\treturn -ENOMEM;
\t}
\tiowrite32(0x02, cm_per + CM_PER_GPIO2_CLKCTRL);
\tiounmap(cm_per);

\tret = gpio_request_one(BUTTON_YELLOW, GPIOF_IN, "btn_yellow");
\tif (ret) {
\t\tprintk(KERN_ERR "Blad gpio_request dla GPIO68: %d\\n", ret);
\t\treturn ret;
\t}

\tret = gpio_request_one(BUTTON_BLUE, GPIOF_IN, "btn_blue");
\tif (ret) {
\t\tprintk(KERN_ERR "Blad gpio_request dla GPIO69: %d\\n", ret);
\t\tgpio_free(BUTTON_YELLOW);
\t\treturn ret;
\t}

\tirq_yellow = gpio_to_irq(BUTTON_YELLOW);
\tif (irq_yellow < 0) {
\t\tprintk(KERN_ERR "Blad gpio_to_irq GPIO68: %d\\n", irq_yellow);
\t\tret = irq_yellow;
\t\tgoto err_gpio;
\t}

\tirq_blue = gpio_to_irq(BUTTON_BLUE);
\tif (irq_blue < 0) {
\t\tprintk(KERN_ERR "Blad gpio_to_irq GPIO69: %d\\n", irq_blue);
\t\tret = irq_blue;
\t\tgoto err_gpio;
\t}

\tret = request_irq(irq_yellow, button_yellow_isr,
\t\t\t  IRQF_TRIGGER_FALLING, "btn_yellow", NULL);
\tif (ret) {
\t\tprintk(KERN_ERR "Blad request_irq GPIO68: %d\\n", ret);
\t\tgoto err_gpio;
\t}

\tret = request_irq(irq_blue, button_blue_isr,
\t\t\t  IRQF_TRIGGER_FALLING, "btn_blue", NULL);
\tif (ret) {
\t\tprintk(KERN_ERR "Blad request_irq GPIO69: %d\\n", ret);
\t\tfree_irq(irq_yellow, NULL);
\t\tgoto err_gpio;
\t}

\tmem = ioremap(GPIO2_START_ADDR, GPIO2_SIZE);
\tif (!mem) {
\t\tprintk(KERN_ERR "Blad ioremap GPIO2\\n");
\t\tret = -ENOMEM;
\t\tgoto err_irq;
\t}

\tiowrite32(PIN_YELLOW_MASK | PIN_BLUE_MASK,
\t\t  mem + 0x14C);

\tiowrite32(0, mem + 0x148);

\tiounmap(mem);

\tprintk(KERN_INFO "Modul przerwan zaladowany (GPIO68 IRQ=%d, GPIO69 IRQ=%d)\\n",
\t       irq_yellow, irq_blue);
\treturn 0;

err_irq:
\tfree_irq(irq_yellow, NULL);
\tfree_irq(irq_blue, NULL);
err_gpio:
\tgpio_free(BUTTON_YELLOW);
\tgpio_free(BUTTON_BLUE);
\treturn ret;
}

static void __exit interrupt_exit(void)
{
\tfree_irq(irq_yellow, NULL);
\tfree_irq(irq_blue, NULL);
\tgpio_free(BUTTON_YELLOW);
\tgpio_free(BUTTON_BLUE);
\tprintk(KERN_INFO "Modul przerwan wyladowany\\n");
}

module_init(interrupt_init);
module_exit(interrupt_exit);`
      }
    ],
    downloads: []
  },
  {
    id: 26,
    title: "Sterownik z timerem",
    desc: "Sterownik znakowy wysylajacy komunikaty do dmesg co 1, 4 lub 8 sekund.",
    pdf: "zadanie26/zad26.pdf",
    uruchomienie: "zadanie26/uruchomienie.txt",
    needsFields: { albumNumber: false, fullName: true, initials: false },
    files: [
      {
        name: "timer_driver.c",
        type: "text",
        template: `#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>
#include <linux/timer.h>
#include <linux/jiffies.h>

#define DEVICE_NAME "sterownik"
#define CLASS_NAME  "bbb_timer"

static dev_t dev_number;
static struct cdev timer_cdev;
static struct class *timer_class;
static struct timer_list timer;
static unsigned int interval_ms = 1000;
static unsigned int timer_count;

static void timer_callback(struct timer_list *data)
{
\tprintk(KERN_INFO "Komunikat timera (okres %u ms) [%u]\\n",
\t       interval_ms, timer_count++);
\tmod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
}

static int timer_open(struct inode *inode, struct file *file)
{
\treturn 0;
}

static int timer_release(struct inode *inode, struct file *file)
{
\treturn 0;
}

static ssize_t timer_write(struct file *file, const char __user *buf,
\t\t\t   size_t count, loff_t *ppos)
{
\tchar kbuf[16];
\tunsigned long val;
\tint i;

\tif (count == 0)
\t\treturn 0;

\tif (count > sizeof(kbuf) - 1)
\t\tcount = sizeof(kbuf) - 1;

\tif (copy_from_user(kbuf, buf, count))
\t\treturn -EFAULT;

\tkbuf[count] = '\\0';

\tfor (i = 0; kbuf[i]; i++) {
\t\tif (kbuf[i] == '\\n') {
\t\t\tkbuf[i] = '\\0';
\t\t\tbreak;
\t\t}
\t}

\tif (kstrtoul(kbuf, 10, &val) != 0)
\t\treturn -EINVAL;

\tif (val != 1 && val != 4 && val != 8)
\t\treturn -EINVAL;

\tinterval_ms = val * 1000;
\tmod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
\tprintk(KERN_INFO "Zmieniono okres timera na %lu s\\n", val);

\treturn count;
}

static const struct file_operations timer_fops = {
\t.owner   = THIS_MODULE,
\t.open    = timer_open,
\t.release = timer_release,
\t.write   = timer_write,
};

static int __init timer_init(void)
{
\tint ret;
\tstruct device *device;

\tret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
\tif (ret)
\t\treturn ret;

\tcdev_init(&timer_cdev, &timer_fops);
\tret = cdev_add(&timer_cdev, dev_number, 1);
\tif (ret)
\t\tgoto err_chrdev;

\ttimer_class = class_create(THIS_MODULE, CLASS_NAME);
\tif (IS_ERR(timer_class)) {
\t\tret = PTR_ERR(timer_class);
\t\tgoto err_cdev;
\t}

\tdevice = device_create(timer_class, NULL, dev_number, NULL, DEVICE_NAME);
\tif (IS_ERR(device)) {
\t\tret = PTR_ERR(device);
\t\tgoto err_class;
\t}

\ttimer_setup(&timer, timer_callback, 0);
\tmod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
\tprintk(KERN_INFO "Sterownik zaladowany, domyslny okres: 1 s\\n");

\treturn 0;

err_class:
\tclass_destroy(timer_class);
err_cdev:
\tcdev_del(&timer_cdev);
err_chrdev:
\tunregister_chrdev_region(dev_number, 1);
\treturn ret;
}

static void __exit timer_exit(void)
{
\tdel_timer_sync(&timer);
\tdevice_destroy(timer_class, dev_number);
\tclass_destroy(timer_class);
\tcdev_del(&timer_cdev);
\tunregister_chrdev_region(dev_number, 1);
\tprintk(KERN_INFO "Sterownik wyladowany\\n");
}

module_init(timer_init);
module_exit(timer_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("__NAME__");
MODULE_DESCRIPTION("Sterownik znakowy z kernelem timerem");`
      }
    ],
    downloads: []
  }
];
