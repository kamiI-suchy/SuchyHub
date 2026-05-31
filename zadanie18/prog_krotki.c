#include <stdio.h>
#include <unistd.h>

int main() {
	FILE * trigger    = fopen("/sys/class/leds/beaglebone:green:usr3/trigger",    "w");
	FILE * brightness = fopen("/sys/class/leds/beaglebone:green:usr3/brightness", "w");

	fprintf(trigger, "none\n");
	fflush(trigger);

	while(1) {
		fprintf(brightness, "1\n"); fflush(brightness); usleep(1500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); usleep(1500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		usleep(1000000);
		fprintf(brightness, "1\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "1\n"); fflush(brightness); usleep(500000);
		fprintf(brightness, "0\n"); fflush(brightness); usleep(500000);
		usleep(3000000);
	}

	return 0;
}
