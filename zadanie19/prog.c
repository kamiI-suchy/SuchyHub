#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <signal.h>
#include <stdbool.h>

#define LED_RED "66"
#define LED_GREEN "67"

#define GPIO_PATH "/sys/class/gpio"
#define EXPORT_PATH GPIO_PATH "/export"
#define UNEXPORT_PATH GPIO_PATH "/unexport"
#define DIRECTION_PATH GPIO_PATH "/gpio%s/direction"
#define VALUE_PATH GPIO_PATH "/gpio%s/value"

#define BLINK_DURATION 10
#define BLINK_INTERVAL 500000

static volatile sig_atomic_t keep_running = 1;

static void write_sysfs(const char *path, const char *value) {
	int fd = open(path, O_WRONLY);
	if (fd < 0) {
		perror("Nie można otworzyć pliku sysfs");
		exit(1);
	}
	if (write(fd, value, strlen(value)) != (ssize_t)strlen(value)) {
		perror("Nie można zapisać do pliku sysfs");
		close(fd);
		exit(1);
	}
	close(fd);
}

static void safe_usleep(unsigned usec) {
	const unsigned SLICE = 100000;
	while (usec > 0 && keep_running) {
		unsigned slice = (usec > SLICE) ? SLICE : usec;
		usleep(slice);
		usec -= slice;
	}
}

static void handle_sigint(int sig) {
	(void)sig;
	keep_running = 0;
}

int main() {
	char path[128];

	signal(SIGINT, handle_sigint);

	write_sysfs(EXPORT_PATH, LED_RED);
	write_sysfs(EXPORT_PATH, LED_GREEN);

	snprintf(path, sizeof(path), DIRECTION_PATH, LED_RED);
	write_sysfs(path, "out");
	snprintf(path, sizeof(path), DIRECTION_PATH, LED_GREEN);
	write_sysfs(path, "out");

	int cycles = (BLINK_DURATION * 1000000) / (2 * BLINK_INTERVAL);

	for (int i = 0; i < cycles && keep_running; i++) {
		snprintf(path, sizeof(path), VALUE_PATH, LED_RED);
		write_sysfs(path, "1");
		snprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
		write_sysfs(path, "0");
		safe_usleep(BLINK_INTERVAL);

		snprintf(path, sizeof(path), VALUE_PATH, LED_RED);
		write_sysfs(path, "0");
		snprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
		write_sysfs(path, "1");
		safe_usleep(BLINK_INTERVAL);
	}

	snprintf(path, sizeof(path), VALUE_PATH, LED_RED);
	write_sysfs(path, "0");
	snprintf(path, sizeof(path), VALUE_PATH, LED_GREEN);
	write_sysfs(path, "0");

	write_sysfs(UNEXPORT_PATH, LED_RED);
	write_sysfs(UNEXPORT_PATH, LED_GREEN);

	return 0;
}
