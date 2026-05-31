/*
 * bitbang_cbus.c – sterowanie 4 LEDami przez CBUS bitbang (poprawione)
 *
 * Sterowanie:
 *   1 2 3 4  – włącz LED (odpowiednio LED1..LED4)
 *   q w e r  – wyłącz LED (odpowiednio LED1..LED4)
 *   ESC / x  – wyjście
 *
 * Hardware: diody aktywne niskim stanem (katoda do CBUS, anoda do VCC)
 *   stan 0 = LED ON, 1 = LED OFF
 *
 * Mapowanie fizyczne (poprawione):
 *   LED1 – CBUS0 (bit 0)
 *   LED2 – CBUS1 (bit 1)
 *   LED3 – CBUS3 (bit 3)   <-- zamiana względem oryginału
 *   LED4 – CBUS2 (bit 2)   <--
 *
 * Maska CBUS: górny nibble (7-4) = kierunek (1=wyjście),
 *              dolny nibble (3-0) = stan wyjścia (0=ON, 1=OFF).
 */

#include <stdio.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <ftdi.h>

static struct termios orig_termios;

static void disable_raw_mode(void)
{
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
}

static void enable_raw_mode(void)
{
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);
    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
}

/* Wyświetla stan diod w kolejności 1,2,3,4 z poprawnym mapowaniem bitów */
static void print_leds(unsigned char state)
{
    /* Kolejność bitów dla LED1..LED4 zgodnie z fizycznym podłączeniem */
    const int led_bits[4] = {0, 1, 3, 2};  /* LED1: bit0, LED2: bit1, LED3: bit3, LED4: bit2 */

    printf("\rLEDy: ");
    for (int i = 0; i < 4; i++) {
        /* bit = 1 -> OFF, bit = 0 -> ON */
        const char *status = ((state >> led_bits[i]) & 1) ? "OFF" : "ON ";
        printf("[LED%d:%s] ", i + 1, status);
    }
    fflush(stdout);
}

int main(void)
{
    struct ftdi_context *ftdi;
    int f;
    /* Początkowo wszystkie wyjścia w stanie wysokim (1) -> diody zgaszone */
    unsigned char state = 0x0F;   /* bity 3..0 = 1111 (OFF) */

    if ((ftdi = ftdi_new()) == 0) {
        fprintf(stderr, "ftdi_new failed\n");
        return EXIT_FAILURE;
    }

    f = ftdi_usb_open(ftdi, 0x0403, 0x6001);
    if (f < 0 && f != -5) {
        fprintf(stderr, "unable to open ftdi device: %d (%s)\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_free(ftdi);
        exit(-1);
    }
    printf("ftdi open succeeded: %d\n", f);

    /* Wszystkie 4 piny CBUS jako wyjścia, diody wyłączone (stan wysoki) */
    f = ftdi_set_bitmode(ftdi, 0xF0 | state, BITMODE_CBUS);
    if (f < 0) {
        fprintf(stderr, "set_bitmode failed, error %d (%s)\n",
                f, ftdi_get_error_string(ftdi));
        ftdi_usb_close(ftdi);
        ftdi_free(ftdi);
        exit(-1);
    }

    printf("\nSterowanie LEDami (aktywne niskim stanem):\n");
    printf("  1 2 3 4  – włącz LED\n");
    printf("  q w e r  – wyłącz LED\n");
    printf("  ESC / x  – wyjście\n\n");
    print_leds(state);

    enable_raw_mode();

    while (1) {
        char c;
        if (read(STDIN_FILENO, &c, 1) != 1) break;

        unsigned char prev = state;

        switch (c) {
        /* --- włączanie (ustawienie 0 na odpowiednim bicie) --- */
        case '1': state &= ~0x01; break;   /* LED1 ON – bit 0 -> 0 */
        case '2': state &= ~0x02; break;   /* LED2 ON – bit 1 -> 0 */
        case '3': state &= ~0x08; break;   /* LED3 ON – bit 3 -> 0 (zamiana) */
        case '4': state &= ~0x04; break;   /* LED4 ON – bit 2 -> 0 (zamiana) */

        /* --- wyłączanie (ustawienie 1 na odpowiednim bicie) --- */
        case 'q': state |=  0x01; break;   /* LED1 OFF */
        case 'w': state |=  0x02; break;   /* LED2 OFF */
        case 'e': state |=  0x08; break;   /* LED3 OFF (bit 3) */
        case 'r': state |=  0x04; break;   /* LED4 OFF (bit 2) */

        case 27:                            /* ESC */
        case 'x': disable_raw_mode();
                  printf("\nKoniec.\n");
                  goto cleanup;
        default:  break;
        }

        if (state != prev) {
            unsigned char mask = 0xF0 | state;
            f = ftdi_set_bitmode(ftdi, mask, BITMODE_CBUS);
            if (f < 0) {
                fprintf(stderr, "\nset_bitmode failed, error %d (%s)\n",
                        f, ftdi_get_error_string(ftdi));
                disable_raw_mode();
                goto cleanup;
            }
            print_leds(state);
        }
    }

    disable_raw_mode();
cleanup:
    printf("\ndisabling bitbang mode\n");
    ftdi_disable_bitbang(ftdi);
    ftdi_usb_close(ftdi);
    ftdi_free(ftdi);

    return 0;
}