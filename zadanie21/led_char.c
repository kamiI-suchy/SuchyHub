#include <linux/module.h>
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
	writel_relaxed(LED_MASK, base_addr + GPIO_SETDATAOUT_OFFSET);
}

static void led_off(void)
{
	writel_relaxed(LED_MASK, base_addr + GPIO_CLEARDATAOUT_OFFSET);
}

static int led_hw_init(void)
{
	u32 reg;

	base_addr = ioremap(GPIO_ADDR_BASE, ADDR_SIZE);
	if (!base_addr)
		return -ENOMEM;

	reg = readl_relaxed(base_addr + GPIO_OE_OFFSET);
	reg &= ~LED_MASK;
	writel_relaxed(reg, base_addr + GPIO_OE_OFFSET);

	led_off();
	return 0;
}

static void led_hw_exit(void)
{
	u32 reg;

	if (!base_addr)
		return;

	led_off();
	reg = readl_relaxed(base_addr + GPIO_OE_OFFSET);
	reg |= LED_MASK;
	writel_relaxed(reg, base_addr + GPIO_OE_OFFSET);

	iounmap(base_addr);
	base_addr = NULL;
}

static int led_open(struct inode *inode __maybe_unused, struct file *file __maybe_unused)
{
	return 0;
}

static int led_release(struct inode *inode __maybe_unused, struct file *file __maybe_unused)
{
	return 0;
}

static bool is_initial(char ch)
{
	ch = toupper(ch);
	return ch == 'K' || ch == 'S';
}

static ssize_t led_write(struct file *file __maybe_unused, const char __user *buf,
			  size_t count, loff_t *ppos __maybe_unused)
{
	char kbuf[128];
	size_t len;
	size_t i;
	bool saw_alpha = false;
	bool matched = false;

	if (count == 0)
		return 0;

	len = min(count, sizeof(kbuf) - 1);
	if (copy_from_user(kbuf, buf, len))
		return -EFAULT;

	kbuf[len] = '\0';

	for (i = 0; i < len; i++) {
		if (!isalpha(kbuf[i]))
			continue;
		saw_alpha = true;
		if (is_initial(kbuf[i])) {
			matched = true;
			break;
		}
	}

	if (matched)
		led_on();
	else if (saw_alpha)
		led_off();

	return count;
}

static const struct file_operations led_fops = {
	.owner = THIS_MODULE,
	.open = led_open,
	.release = led_release,
	.write = led_write,
};

static int __init led_char_init(void)
{
	int ret;
	struct device *device;

	ret = led_hw_init();
	if (ret)
		return ret;

	ret = alloc_chrdev_region(&dev_number, 0, 1, DEVICE_NAME);
	if (ret)
		goto err_hw;

	cdev_init(&led_cdev, &led_fops);
	ret = cdev_add(&led_cdev, dev_number, 1);
	if (ret)
		goto err_chrdev;

	led_class = class_create(THIS_MODULE, CLASS_NAME);
	if (IS_ERR(led_class)) {
		ret = PTR_ERR(led_class);
		goto err_cdev;
	}

	device = device_create(led_class, NULL, dev_number, NULL, DEVICE_NAME);
	if (IS_ERR(device)) {
		ret = PTR_ERR(device);
		goto err_class;
	}

	return 0;

err_class:
	class_destroy(led_class);
err_cdev:
	cdev_del(&led_cdev);
err_chrdev:
	unregister_chrdev_region(dev_number, 1);
err_hw:
	led_hw_exit();
	return ret;
}

static void __exit led_char_exit(void)
{
	device_destroy(led_class, dev_number);
	class_destroy(led_class);
	cdev_del(&led_cdev);
	unregister_chrdev_region(dev_number, 1);
	led_hw_exit();
}

module_init(led_char_init);
module_exit(led_char_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik znakowy do sterowania LED na BBB");
