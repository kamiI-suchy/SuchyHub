#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/gpio.h>
#include <linux/interrupt.h>
#include <linux/io.h>
#include <linux/workqueue.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik przerwań dla przycisków GPIO68 (żółty) i GPIO69 (niebieski) z workqueue");

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

static struct work_struct work_yellow;
static struct work_struct work_blue;

static void button_yellow_work(struct work_struct *work)
{
	printk(KERN_INFO "Kamil Suchy 60859 - obsługa przycisku GPIO68 (żółty)\n");
}

static void button_blue_work(struct work_struct *work)
{
	printk(KERN_INFO "Kamil Suchy 60859 - obsługa przycisku GPIO69 (niebieski)\n");
}

static irqreturn_t button_yellow_isr(int irq, void *dev_id)
{
	schedule_work(&work_yellow);
	return IRQ_HANDLED;
}

static irqreturn_t button_blue_isr(int irq, void *dev_id)
{
	schedule_work(&work_blue);
	return IRQ_HANDLED;
}

static int __init interrupt_init(void)
{
	int ret;
	void __iomem *mem;
	void __iomem *cm_per;

	printk(KERN_INFO "Ładowanie modułu przerwań z workqueue...\n");

	cm_per = ioremap(CM_PER_START_ADDR, CM_PER_SIZE);
	if (!cm_per) {
		printk(KERN_ERR "Błąd ioremap CM_PER\n");
		return -ENOMEM;
	}
	iowrite32(0x02, cm_per + CM_PER_GPIO2_CLKCTRL);
	iounmap(cm_per);

	INIT_WORK(&work_yellow, button_yellow_work);
	INIT_WORK(&work_blue, button_blue_work);

	ret = gpio_request_one(BUTTON_YELLOW, GPIOF_IN, "btn_yellow");
	if (ret) {
		printk(KERN_ERR "Błąd gpio_request dla GPIO68: %d\n", ret);
		return ret;
	}

	ret = gpio_request_one(BUTTON_BLUE, GPIOF_IN, "btn_blue");
	if (ret) {
		printk(KERN_ERR "Błąd gpio_request dla GPIO69: %d\n", ret);
		gpio_free(BUTTON_YELLOW);
		return ret;
	}

	irq_yellow = gpio_to_irq(BUTTON_YELLOW);
	if (irq_yellow < 0) {
		printk(KERN_ERR "Błąd gpio_to_irq GPIO68: %d\n", irq_yellow);
		ret = irq_yellow;
		goto err_gpio;
	}

	irq_blue = gpio_to_irq(BUTTON_BLUE);
	if (irq_blue < 0) {
		printk(KERN_ERR "Błąd gpio_to_irq GPIO69: %d\n", irq_blue);
		ret = irq_blue;
		goto err_gpio;
	}

	ret = request_irq(irq_yellow, button_yellow_isr,
			  IRQF_TRIGGER_FALLING, "btn_yellow", NULL);
	if (ret) {
		printk(KERN_ERR "Błąd request_irq GPIO68: %d\n", ret);
		goto err_gpio;
	}

	ret = request_irq(irq_blue, button_blue_isr,
			  IRQF_TRIGGER_FALLING, "btn_blue", NULL);
	if (ret) {
		printk(KERN_ERR "Błąd request_irq GPIO69: %d\n", ret);
		free_irq(irq_yellow, NULL);
		goto err_gpio;
	}

	mem = ioremap(GPIO2_START_ADDR, GPIO2_SIZE);
	if (!mem) {
		printk(KERN_ERR "Błąd ioremap GPIO2\n");
		ret = -ENOMEM;
		goto err_irq;
	}

	iowrite32(PIN_YELLOW_MASK | PIN_BLUE_MASK,
		  mem + 0x14C);

	iowrite32(0, mem + 0x148);

	iounmap(mem);

	printk(KERN_INFO "Moduł przerwań z workqueue załadowany (GPIO68 IRQ=%d, GPIO69 IRQ=%d)\n",
	       irq_yellow, irq_blue);
	return 0;

err_irq:
	free_irq(irq_yellow, NULL);
	free_irq(irq_blue, NULL);
err_gpio:
	gpio_free(BUTTON_YELLOW);
	gpio_free(BUTTON_BLUE);
	return ret;
}

static void __exit interrupt_exit(void)
{
	cancel_work_sync(&work_yellow);
	cancel_work_sync(&work_blue);
	free_irq(irq_yellow, NULL);
	free_irq(irq_blue, NULL);
	gpio_free(BUTTON_YELLOW);
	gpio_free(BUTTON_BLUE);
	printk(KERN_INFO "Moduł przerwań z workqueue wyładowany\n");
}

module_init(interrupt_init);
module_exit(interrupt_exit);
