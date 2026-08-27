import { renderRouterToStream } from "@tanstack/react-router/ssr/server";
import {
  StartServer,
  createStartHandler,
  defineHandlerCallback,
} from "@tanstack/react-start/server";

const fetch = createStartHandler(
  defineHandlerCallback(({ request, router, responseHeaders }) => {
    // Mimics production setup: inject a per-request nonce
    const nonce = btoa(crypto.randomUUID());
    router.options.ssr = { ...router.options.ssr, nonce };

    return renderRouterToStream({
      request,
      router,
      responseHeaders,
      children: <StartServer router={router} />,
    });
  }),
);

const server = { fetch };
export default server;
