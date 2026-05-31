#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>
#include <linux/timer.h>
#include <linux/jiffies.h>
#include <linux/minmax.h>

MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik znakowy z timerem");
MODULE_LICENSE("GPL");

#define DEVICE_NAME "sterownik"
#define CLASS_NAME  "sterownik_class"
#define DEFAULT_PERIOD_MS 1000

static dev_t dev_number;
static struct cdev sterownik_cdev;
static struct class *sterownik_class;
static struct timer_list sterownik_timer;
static unsigned int timer_period_ms = DEFAULT_PERIOD_MS;

static void timer_callback(struct timer_list *data)
{
	printk(KERN_INFO "Timer: uplynal okres %u sekund\n",
	       timer_period_ms / 1000);
	mod_timer(&sterownik_timer, jiffies + msecs_to_jiffies(timer_period_ms));
}

static int sterownik_open(struct inode *inode, struct file *file)
{
	return 0;
}

static int sterownik_release(struct inode *inode, struct file *file)
{
	return 0;
}

static ssize_t sterownik_write(struct file *file, const char __user *buf,
				size_t count, loff_t *ppos)
{
	char kbuf[16];
	unsigned int val;
	size_t len;

	len = min(count, sizeof(kbuf) - 1);
	if (copy_from_user(kbuf, buf, len))
		return -EFAULT;
	kbuf[len] = '\0';

	if (kstrtouint(kbuf, 10, &val) != 0)
		return -EINVAL;

	if (val != 1 && val != 4 && val != 8)
		return -EINVAL;

	timer_period_ms = val * 1000;
	printk(KERN_INFO "Zmieniono okres timera na %u sekund\n", val);
	mod_timer(&sterownik_timer, jiffies + msecs_to_jiffies(timer_period_ms));

	return count;
}

static const struct file_operations sterownik_fops = {
	.owner   = THIS_MODULE,
	.open    = sterownik_open,
	.release = sterownik_release,
	.write   = sterownik_write,
};

static int __init sterownik_init(void)
{
	int ret;
	struct device *device;

	ret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
	if (ret)
		return ret;

	cdev_init(&sterownik_cdev, &sterownik_fops);
	ret = cdev_add(&sterownik_cdev, dev_number, 1);
	if (ret)
		goto err_chrdev;

	sterownik_class = class_create(THIS_MODULE, CLASS_NAME);
	if (IS_ERR(sterownik_class)) {
		ret = PTR_ERR(sterownik_class);
		goto err_cdev;
	}

	device = device_create(sterownik_class, NULL, dev_number, NULL,
			       DEVICE_NAME);
	if (IS_ERR(device)) {
		ret = PTR_ERR(device);
		goto err_class;
	}

	timer_setup(&sterownik_timer, timer_callback, 0);
	mod_timer(&sterownik_timer, jiffies + msecs_to_jiffies(DEFAULT_PERIOD_MS));

	printk(KERN_INFO "Sterownik /dev/sterownik zaladowany (domyslny okres %u s)\n",
	       DEFAULT_PERIOD_MS / 1000);
	return 0;

err_class:
	class_destroy(sterownik_class);
err_cdev:
	cdev_del(&sterownik_cdev);
err_chrdev:
	unregister_chrdev_region(dev_number, 1);
	return ret;
}

static void __exit sterownik_exit(void)
{
	del_timer_sync(&sterownik_timer);
	device_destroy(sterownik_class, dev_number);
	class_destroy(sterownik_class);
	cdev_del(&sterownik_cdev);
	unregister_chrdev_region(dev_number, 1);
	printk(KERN_INFO "Sterownik /dev/sterownik wyladowany\n");
}

module_init(sterownik_init);
module_exit(sterownik_exit);
