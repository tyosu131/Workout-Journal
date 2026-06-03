// portfolio real\frontend\pages\_app.tsx

import React from "react";
import type { AppProps } from "next/app";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { AuthProvider } from "../../frontend/features/auth/AuthContext";
import Head from "next/head";
import { TagColorProvider } from "../../frontend/features/notes/contexts/TagColorContext";

const theme = extendTheme({
  fonts: {
    heading: "'Roboto', sans-serif",
    body: "'Roboto', sans-serif",
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <TagColorProvider>
            <Component {...pageProps} />
          </TagColorProvider>
        </AuthProvider>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
