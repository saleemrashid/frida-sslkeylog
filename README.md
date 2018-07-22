# frida-sslkeylog

Frida tool to dump an [NSS Key
Log](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/NSS/Key_Log_Format)
for Wireshark, from a process using dynamically linked OpenSSL (or BoringSSL).

This should include Java code on Android, or apps that bundle their own OpenSSL
(or BoringSSL) dynamic library. But it does not support statically linked
OpenSSL (or BoringSSL).

This uses a Wireshark variant of the key log format, instead of the
`CLIENT_RANDOM` label. This is because the Session ID and Master Key can be
portably obtained through Frida, using the ASN.1 encoding of `SSL_SESSION`, but
the Client Random cannot (it requires C structure accesses).

```
RSA Session-ID:<64 hex characters of Session ID> Master-Key:<96 hex characters of Master Key>
```

Despite the use of the label `RSA`, this is not RSA-specific.

## Installation

Install the dependencies (`frida-tools` and `pyasn1`).

```sh
pip install -r requirements.txt
```

## Usage

 1. If necessary, start [Frida server](https://www.frida.re/docs/android/) on
    your Android device

    While this should work elsewhere, it was written for and only tested on Android.

 2. Run the Frida tool. For example, to connect to an Android device over USB

    ```bash
    ./sslkeylog -U -n <package name> -o <key log filename>
    ```

    As the key log file is opened in append mode, you can run multiple
    instances of the tool at the same time.

    Chromium-based browsers will not work because they statically link
    BoringSSL. Firefox-based browsers will not work because they use NSS.

 3. Set the "(Pre-)Master-Secret log filename" in the protocol configuration
    for SSL, in Wireshark. Wireshark should display a tab named "Decrypted SSL
    Data" for subsequent packets from the processes.
