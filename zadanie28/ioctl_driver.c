#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>

#define DEVICE_NAME "ioctl_dev"
#define CLASS_NAME  "bbb_ioctl"

#define IOCTL_MAGIC       'k'
#define IOCTL_GET_NAME     _IOC(_IOC_READ,  IOCTL_MAGIC, 1, 64)
#define IOCTL_GET_SURNAME  _IOC(_IOC_READ,  IOCTL_MAGIC, 2, 64)
#define IOCTL_GET_INDEX    _IOC(_IOC_READ,  IOCTL_MAGIC, 3, 64)

static dev_t dev_number;
static struct cdev ioctl_cdev;
static struct class *ioctl_class;

static long ioctl_dev_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
	switch (cmd) {
	case IOCTL_GET_NAME:
		if (copy_to_user((char __user *)arg, "Kamil", sizeof("Kamil")))
			return -EFAULT;
		break;
	case IOCTL_GET_SURNAME:
		if (copy_to_user((char __user *)arg, "Suchy", sizeof("Suchy")))
			return -EFAULT;
		break;
	case IOCTL_GET_INDEX:
		if (copy_to_user((char __user *)arg, "60859", sizeof("60859")))
			return -EFAULT;
		break;
	default:
		return -EINVAL;
	}
	return 0;
}

static const struct file_operations ioctl_fops = {
	.owner          = THIS_MODULE,
	.unlocked_ioctl = ioctl_dev_ioctl,
};

static int __init ioctl_init(void)
{
	int ret;
	struct device *device;

	ret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
	if (ret)
		return ret;

	cdev_init(&ioctl_cdev, &ioctl_fops);
	ret = cdev_add(&ioctl_cdev, dev_number, 1);
	if (ret)
		goto err_chrdev;

	ioctl_class = class_create(THIS_MODULE, CLASS_NAME);
	if (IS_ERR(ioctl_class)) {
		ret = PTR_ERR(ioctl_class);
		goto err_cdev;
	}

	device = device_create(ioctl_class, NULL, dev_number, NULL, DEVICE_NAME);
	if (IS_ERR(device)) {
		ret = PTR_ERR(device);
		goto err_class;
	}

	printk(KERN_INFO "Modul ioctl zaladowany (/dev/%s)\n", DEVICE_NAME);
	return 0;

err_class:
	class_destroy(ioctl_class);
err_cdev:
	cdev_del(&ioctl_cdev);
err_chrdev:
	unregister_chrdev_region(dev_number, 1);
	return ret;
}

static void __exit ioctl_exit(void)
{
	device_destroy(ioctl_class, dev_number);
	class_destroy(ioctl_class);
	cdev_del(&ioctl_cdev);
	unregister_chrdev_region(dev_number, 1);
	printk(KERN_INFO "Modul ioctl wyladowany\n");
}

module_init(ioctl_init);
module_exit(ioctl_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik znakowy z obsluga ioctl");
