#include <linux/module.h>
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
	printk(KERN_INFO "Komunikat timera (okres %u ms) [%u]\n",
	       interval_ms, timer_count++);
	mod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
}

static int timer_open(struct inode *inode, struct file *file)
{
	return 0;
}

static int timer_release(struct inode *inode, struct file *file)
{
	return 0;
}

static ssize_t timer_write(struct file *file, const char __user *buf,
			   size_t count, loff_t *ppos)
{
	char kbuf[16];
	unsigned long val;
	int i;

	if (count == 0)
		return 0;

	if (count > sizeof(kbuf) - 1)
		count = sizeof(kbuf) - 1;

	if (copy_from_user(kbuf, buf, count))
		return -EFAULT;

	kbuf[count] = '\0';

	for (i = 0; kbuf[i]; i++) {
		if (kbuf[i] == '\n') {
			kbuf[i] = '\0';
			break;
		}
	}

	if (kstrtoul(kbuf, 10, &val) != 0)
		return -EINVAL;

	if (val != 1 && val != 4 && val != 8)
		return -EINVAL;

	interval_ms = val * 1000;
	mod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
	printk(KERN_INFO "Zmieniono okres timera na %lu s\n", val);

	return count;
}

static const struct file_operations timer_fops = {
	.owner   = THIS_MODULE,
	.open    = timer_open,
	.release = timer_release,
	.write   = timer_write,
};

static int __init timer_init(void)
{
	int ret;
	struct device *device;

	ret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
	if (ret)
		return ret;

	cdev_init(&timer_cdev, &timer_fops);
	ret = cdev_add(&timer_cdev, dev_number, 1);
	if (ret)
		goto err_chrdev;

	timer_class = class_create(THIS_MODULE, CLASS_NAME);
	if (IS_ERR(timer_class)) {
		ret = PTR_ERR(timer_class);
		goto err_cdev;
	}

	device = device_create(timer_class, NULL, dev_number, NULL, DEVICE_NAME);
	if (IS_ERR(device)) {
		ret = PTR_ERR(device);
		goto err_class;
	}

	timer_setup(&timer, timer_callback, 0);
	mod_timer(&timer, jiffies + msecs_to_jiffies(interval_ms));
	printk(KERN_INFO "Sterownik zaladowany, domyslny okres: 1 s\n");

	return 0;

err_class:
	class_destroy(timer_class);
err_cdev:
	cdev_del(&timer_cdev);
err_chrdev:
	unregister_chrdev_region(dev_number, 1);
	return ret;
}

static void __exit timer_exit(void)
{
	del_timer_sync(&timer);
	device_destroy(timer_class, dev_number);
	class_destroy(timer_class);
	cdev_del(&timer_cdev);
	unregister_chrdev_region(dev_number, 1);
	printk(KERN_INFO "Sterownik wyladowany\n");
}

module_init(timer_init);
module_exit(timer_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik znakowy z kernelem timerem");
