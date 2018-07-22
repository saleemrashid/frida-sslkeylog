"use strict"

function allocPointer(value) {
    const address = Memory.alloc(Process.pointerSize);

    Memory.writePointer(address, value);

    return address;
}

function queryPrefixFromMatch(match) {
    const name = match.name;

    const delimiterIndex = name.indexOf("!");
    const moduleQuery = name.substring(0, delimiterIndex + 1);

    return "exports:" + moduleQuery;
}

const resolver = new ApiResolver("module");

resolver.enumerateMatches("exports:*!SSL_connect", {
    onMatch: function (match) {
        const queryPrefix = queryPrefixFromMatch(match);

        function resolveExport(name) {
            const matches = resolver.enumerateMatchesSync(queryPrefix + name);

            if (matches.length == 0) {
                return null;
            }

            return matches[0].address;
        }

        function resolveFunction(name, returnType, argTypes) {
            const address = resolveExport(name);

            return new NativeFunction(address, returnType, argTypes);
        }

        const SSL_get_session = resolveFunction(
            "SSL_get_session", "pointer", ["pointer"]
        );

        const i2d_SSL_SESSION = resolveFunction(
            "i2d_SSL_SESSION", "int", ["pointer", "pointer"]
        );

        function encodeSSLSession(session) {
            const length = i2d_SSL_SESSION(session, NULL);
            const address = Memory.alloc(length);

            i2d_SSL_SESSION(session, allocPointer(address));

            return Memory.readByteArray(address, length);
        };

        function handleSSL(ssl) {
            const session = SSL_get_session(ssl);
            send("session", encodeSSLSession(session));
        }

        Interceptor.attach(match.address, {
            onEnter: function(args) {
                this.ssl = args[0];
            },

            onLeave: function (retvalue) {
                handleSSL(this.ssl);
            }
        });

        function attachSSLExport(name) {
            Interceptor.attach(resolveExport(name), {
                onEnter: function (args) {
                    const ssl = args[0];
                    handleSSL(ssl);
                }
            });
        }

        attachSSLExport("SSL_read");
        attachSSLExport("SSL_write");
    },

    onComplete: function() {}
});
