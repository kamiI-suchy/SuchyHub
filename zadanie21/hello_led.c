#include <linux/module.h>   /* Needed by all modules */
#include <linux/kernel.h>   /* Needed for KERN_INFO */
#include <linux/io.h>
#include <linux/delay.h>

#define GPIO_ADDR_BASE              0x4804C000
#define ADDR_SIZE                   0X1000
#define GPIO_SETDATAOUT_OFFSET      0X194
#define GPIO_CLEARDATAOUT_OFFSET    0X190
#define GPIO_OE_OFFSET              0X134
#define GPIO_DATAIN_OFFSET          0X138

// enable IRQ
#define GPIO_IRQSTATUS_RAW_0_OFFSET 0X24
// enable interrupt
#define GPIO_IRQSTATUS_SET_0_OFFSET 0X34
// define intterupt type
#define GPIO_RISINGDETECT_OFFSET    0X148
// enable debounce feature
#define GPIO_DEBOUNCENABLE_OFFSET   0X150
// set debounce time
#define GPIO_DEBOUNCINGTIME_OFFSET  0X154


#define LED_VALUE_0                 ~(1 << 24)
#define LED_VALUE_1                  (1 << 24)

void __iomem *base_addr;

int init_module(void)
{
    printk(KERN_EMERG "Hello");

    base_addr = ioremap(GPIO_ADDR_BASE, ADDR_SIZE);

    // CONFIG for LED
    /* write 0 to GPIO Pin 30 mean config this pin is output */
    writel_relaxed(LED_VALUE_0, base_addr + GPIO_OE_OFFSET);
    // at insert module time, led off
    writel_relaxed(LED_VALUE_1, base_addr + GPIO_SETDATAOUT_OFFSET);

    return 0;
}

void cleanup_module(void)
{
    printk(KERN_EMERG "Goodbye");

    /* off led */
    writel_relaxed(LED_VALUE_1, base_addr + GPIO_CLEARDATAOUT_OFFSET);

    /* config default GPIO Pin is input
     * set Pin 30 to  default
     */
    writel_relaxed(LED_VALUE_1, base_addr + GPIO_CLEARDATAOUT_OFFSET);
}

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Phu Luu An");
MODULE_DESCRIPTION("Hello world kernel module");

