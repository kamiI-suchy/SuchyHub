#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/gpio.h>
#include <linux/interrupt.h>
#include <linux/io.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik przerwan dla przyciskow GPIO68 (zolty) i GPIO69 (niebieski)");

#define GPIO2_START_ADDR        0x481AC000
#define GPIO2_SIZE              0x1000

#define CM_PER_START_ADDR       0x44E00000
#define CM_PER_SIZE             0x400
#define CM_PER_GPIO2_CLKCTRL    0xB0

#define BUTTON_YELLOW           68
#define BUTTON_BLUE             69

#define GPIO_IRQSTATUS_0        0x2C
#define GPIO_IRQSTATUS_1        0x30
#define GPIO_RISINGDETECT       0x148
#define GPIO_FALLINGDETECT      0x14C

#define PIN_YELLOW_MASK         (1 << 4)
#define PIN_BLUE_MASK           (1 << 5)

static int irq_yellow;
static int irq_blue;

static irqreturn_t button_yellow_isr(int irq, void *dev_id)
{
	printk(KERN_INFO "Wcisniety przycisk GPIO68 (zolty)\n");
	return IRQ_HANDLED;
}

static irqreturn_t button_blue_isr(int irq, void *dev_id)
{
	printk(KERN_INFO "Wcisniety przycisk GPIO69 (niebieski)\n");
	return IRQ_HANDLED;
}

static int __init interrupt_init(void)
{
	int ret;
	int regval;
	void __iomem *mem;
	void __iomem *cm_per;

	printk(KERN_INFO "Ladowanie modulu przerwan...\n");

	cm_per = ioremap(CM_PER_START_ADDR, CM_PER_SIZE);
	if (!cm_per) {
		printk(KERN_ERR "Blad ioremap CM_PER\n");
		return -ENOMEM;
	}
	iowrite32(0x02, cm_per + CM_PER_GPIO2_CLKCTRL);
	iounmap(cm_per);

	ret = gpio_request_one(BUTTON_YELLOW, GPIOF_IN, "btn_yellow");
	if (ret) {
		printk(KERN_ERR "Blad gpio_request dla GPIO68: %d\n", ret);
		return ret;
	}

	ret = gpio_request_one(BUTTON_BLUE, GPIOF_IN, "btn_blue");
	if (ret) {
		printk(KERN_ERR "Blad gpio_request dla GPIO69: %d\n", ret);
		gpio_free(BUTTON_YELLOW);
		return ret;
	}

	irq_yellow = gpio_to_irq(BUTTON_YELLOW);
	if (irq_yellow < 0) {
		printk(KERN_ERR "Blad gpio_to_irq GPIO68: %d\n", irq_yellow);
		ret = irq_yellow;
		goto err_gpio;
	}

	irq_blue = gpio_to_irq(BUTTON_BLUE);
	if (irq_blue < 0) {
		printk(KERN_ERR "Blad gpio_to_irq GPIO69: %d\n", irq_blue);
		ret = irq_blue;
		goto err_gpio;
	}

	ret = request_irq(irq_yellow, button_yellow_isr,
			  IRQF_TRIGGER_FALLING, "btn_yellow", NULL);
	if (ret) {
		printk(KERN_ERR "Blad request_irq GPIO68: %d\n", ret);
		goto err_gpio;
	}

	ret = request_irq(irq_blue, button_blue_isr,
			  IRQF_TRIGGER_FALLING, "btn_blue", NULL);
	if (ret) {
		printk(KERN_ERR "Blad request_irq GPIO69: %d\n", ret);
		free_irq(irq_yellow, NULL);
		goto err_gpio;
	}

	mem = ioremap(GPIO2_START_ADDR, GPIO2_SIZE);
	if (!mem) {
		printk(KERN_ERR "Blad ioremap GPIO2\n");
		ret = -ENOMEM;
		goto err_irq;
	}

	regval = ioread32(mem + GPIO_IRQSTATUS_0);
	regval |= PIN_YELLOW_MASK | PIN_BLUE_MASK;
	iowrite32(regval, mem + GPIO_IRQSTATUS_0);

	regval = ioread32(mem + GPIO_IRQSTATUS_1);
	regval |= PIN_YELLOW_MASK | PIN_BLUE_MASK;
	iowrite32(regval, mem + GPIO_IRQSTATUS_1);

	regval = ioread32(mem + GPIO_RISINGDETECT);
	regval &= ~(PIN_YELLOW_MASK | PIN_BLUE_MASK);
	iowrite32(regval, mem + GPIO_RISINGDETECT);

	regval = ioread32(mem + GPIO_FALLINGDETECT);
	regval |= PIN_YELLOW_MASK | PIN_BLUE_MASK;
	iowrite32(regval, mem + GPIO_FALLINGDETECT);

	iounmap(mem);

	printk(KERN_INFO "Modul przerwan zaladowany (GPIO68 IRQ=%d, GPIO69 IRQ=%d)\n",
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
	free_irq(irq_yellow, NULL);
	free_irq(irq_blue, NULL);
	gpio_free(BUTTON_YELLOW);
	gpio_free(BUTTON_BLUE);
	printk(KERN_INFO "Modul przerwan wyladowany\n");
}

module_init(interrupt_init);
module_exit(interrupt_exit);
