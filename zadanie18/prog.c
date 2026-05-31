#include <stdio.h>
#include <unistd.h>
#include <signal.h>
#include <stdlib.h>
#include <stdbool.h>

static FILE *trigger = NULL;
static FILE *brightness = NULL;
static volatile sig_atomic_t keep_running = 1;

static void handle_sigint(int sig) {
	(void)sig;
	keep_running = 0;
}

static void safe_usleep(unsigned usec) {
	const unsigned SLICE = 100000;
	while (usec > 0 && keep_running) {
		unsigned slice = (usec > SLICE) ? SLICE : usec;
		usleep(slice);
		usec -= slice;
	}
}

int main() {
	trigger = fopen("/sys/class/leds/beaglebone:green:usr3/trigger", "w");
	brightness = fopen("/sys/class/leds/beaglebone:green:usr3/brightness", "w");

	if (!trigger || !brightness) {
		perror("Błąd otwarcia plików sysfs");
		return 1;
	}

	signal(SIGINT, handle_sigint);

	fprintf(trigger, "none\n");
	fflush(trigger);

	while (keep_running) {
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(1500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(1500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		safe_usleep(1000000);
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); safe_usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); safe_usleep(500000);
		safe_usleep(3000000);
	}

	fprintf(brightness, "0\n");
	fflush(brightness);
	fclose(brightness);
	fclose(trigger);
	return 0;
}
