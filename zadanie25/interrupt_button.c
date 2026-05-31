#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/gpio.h>
#include <linux/interrupt.h>
#include <linux/io.h>
#include <linux/irq.h>

MODULE_AUTHOR("Kamil Suchy");
MODULE_DESCRIPTION("Sterownik obslugi przerwan dla GPIO68 i GPIO69");
MODULE_LICENSE("GPL");

#define GPIO2_START_ADDR   0x481AC000
#define GPIO2_SIZE         (0x481ADFFF - GPIO2_START_ADDR)

#define CM_PER_START_ADDR  0x44E00000
#define CM_PER_SIZE        0x400
#define CM_PER_GPIO2_CLKCTRL 0xB0

#define GPIO_IRQSTATUS_0   0x2C
#define GPIO_IRQSTATUS_1   0x30
#define GPIO_RISINGDETECT  0x148
#define GPIO_FALLINGDETECT 0x14C

#define PIN_BUTTON1 68
#define PIN_BUTTON2 69

static irqreturn_t irq_handler_button1(int irq, void *dev_id)
{
	printk(KERN_INFO "Przycisk GPIO68 nacisniety\n");
	return IRQ_HANDLED;
}

static irqreturn_t irq_handler_button2(int irq, void *dev_id)
{
	printk(KERN_INFO "Przycisk GPIO69 nacisniety\n");
	return IRQ_HANDLED;
}

static int __init interrupt_button_init(void)
{
	int retval, irq1, irq2;
	u32 regval;
	void __iomem *mem, *cm_per;

	printk(KERN_INFO "Ladowanie modulu obslugi przerwan...\n");

	retval = gpio_request_one(PIN_BUTTON1, GPIOF_IN, "BUTTON1_GPIO68");
	if (retval)
		printk(KERN_ERR "Blad: nie mozna zarezerwowac GPIO68 (blad %i)\n", retval);

	retval = gpio_request_one(PIN_BUTTON2, GPIOF_IN, "BUTTON2_GPIO69");
	if (retval)
		printk(KERN_ERR "Blad: nie mozna zarezerwowac GPIO69 (blad %i)\n", retval);

	irq1 = gpio_to_irq(PIN_BUTTON1);
	irq2 = gpio_to_irq(PIN_BUTTON2);

	retval = request_irq(irq1, irq_handler_button1,
			     0, "BUTTON1_GPIO68", NULL);
	irq_set_irq_type(irq1, IRQ_TYPE_EDGE_BOTH);
	if (retval)
		printk(KERN_ERR "Blad: request_irq dla GPIO68 (blad %i)\n", retval);
	else
		printk(KERN_INFO "GPIO68 -> IRQ %i\n", irq1);

	retval = request_irq(irq2, irq_handler_button2,
			     0, "BUTTON2_GPIO69", NULL);
	irq_set_irq_type(irq2, IRQ_TYPE_EDGE_BOTH);
	if (retval)
		printk(KERN_ERR "Blad: request_irq dla GPIO69 (blad %i)\n", retval);
	else
		printk(KERN_INFO "GPIO69 -> IRQ %i\n", irq2);

	cm_per = ioremap(CM_PER_START_ADDR, CM_PER_SIZE);
	if (!cm_per) {
		printk(KERN_ERR "Blad: nie mozna zmapowac CM_PER\n");
		return 0;
	}
	iowrite32(0x02, cm_per + CM_PER_GPIO2_CLKCTRL);
	iounmap(cm_per);

	mem = ioremap(GPIO2_START_ADDR, GPIO2_SIZE);
	if (!mem) {
		printk(KERN_ERR "Blad: nie mozna zmapowac GPIO2\n");
		return 0;
	}

	regval = ioread32(mem + GPIO_IRQSTATUS_0);
	regval |= (1 << 4) | (1 << 5);
	iowrite32(regval, mem + GPIO_IRQSTATUS_0);

	regval = ioread32(mem + GPIO_IRQSTATUS_1);
	regval |= (1 << 4) | (1 << 5);
	iowrite32(regval, mem + GPIO_IRQSTATUS_1);

	regval = ioread32(mem + GPIO_RISINGDETECT);
	regval |= (1 << 4) | (1 << 5);
	iowrite32(regval, mem + GPIO_RISINGDETECT);

	regval = ioread32(mem + GPIO_FALLINGDETECT);
	regval |= (1 << 4) | (1 << 5);
	iowrite32(regval, mem + GPIO_FALLINGDETECT);

	iounmap(mem);

	return 0;
}

static void __exit interrupt_button_exit(void)
{
	printk(KERN_INFO "Zwalnianie zasobow przerwan...\n");
	free_irq(gpio_to_irq(PIN_BUTTON1), NULL);
	gpio_free(PIN_BUTTON1);
	free_irq(gpio_to_irq(PIN_BUTTON2), NULL);
	gpio_free(PIN_BUTTON2);
	printk(KERN_INFO "Modul obslugi przerwan wyladowany\n");
}

module_init(interrupt_button_init);
module_exit(interrupt_button_exit);
