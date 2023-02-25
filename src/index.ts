/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */

import request from "superagent";

import config from "./config";

const baseUrl = config.baseUrl;
const calendarIds = config.calendarIds;
const resource = config.resource;
const apiKey = config.apiKey;

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

const ___ = undefined;

const runHandler = async (
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<any> => {
  const calendars = await Promise.all(
    calendarIds.map(async (cal) => {
      const url = `${baseUrl + cal.id + resource}?key=${apiKey}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          referer: "https://covenofthewoods.church",
          origin: "https://covenofthewoods.church",
        },
      });
      const results = await res.json();
      const events = results.items
        .filter((item) => item.status === "confirmed")
        .map((item) => ({
          start: item.start.date,
          end: item.end.date,
          category: item.summary.split("-")[1].trim(),
        }));
      return { events };
    })
  );
  const calendarsFormatted = calendars.reduce((prev, next) =>
    Object.assign({}, prev, next)
  );
  return JSON.stringify(calendarsFormatted);
};

export default {
  async scheduled(...props: any[]): Promise<void> {
    await runHandler(...props);
  },
  async fetch(...props: any[]) {
    const results = await runHandler(...props);
    return new Response(results, {});
  },
};
