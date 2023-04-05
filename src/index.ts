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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

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

async function handleOptions(request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers": request.headers.get(
          "Access-Control-Request-Headers"
        ),
      },
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}

const runHandler = async (event: any): Promise<any> => {
  const { searchParams } = new URL(event.url);
  const calId = searchParams.get("calid");

  if (!calId) {
    const error = new Error("No calendar id provided");
    error.status = 400;
    error.statusText = "Bad Request";
    throw error;
  }
  console.log(event.url);
  console.log("searchParams", searchParams);
  console.log("calId", calId);

  const calendars = await Promise.all(
    [{ id: calId }].map(async (cal) => {
      const url = `${baseUrl + cal.id + resource}?${new URLSearchParams({
        key: apiKey,
        // timeMin to the beginning of today with hours, minutes, seconds, and milliseconds set to 0
        timeMin: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        // timeMax to the end of 28 days from today with hours, minutes, seconds, and milliseconds set to 0
        timeMax: new Date(
          new Date().setDate(new Date().getDate() + 28)
        ).toISOString(),
      })}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          referer: "https://covenofthewoods.church",
          origin: "https://covenofthewoods.church",
        },
      });
      const results = await res.json();
      console.log("results", results);
      console.log("results.error.errors", results.error?.errors);
      const events = results.items
        .filter((item) => item.status === "confirmed")
        .map((item) => ({
          start: item.start.date,
          end: item.end.date,
          category: item.summary.split("-")[1].trim(),
        }));
      return { events };
    })
  ).catch((e) => {
    console.log("error", e);
    const error = new Error("Error fetching calendar");
    error.status = 500;
    error.statusText = "Internal Server Error";
    throw error;
  });
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
    if (props[0].method === "OPTIONS") {
      // Handle CORS preflight requests
      return handleOptions(request);
    }

    try {
      const results = await runHandler(...props);

      const response = new Response(results, {});
      // Set CORS headers

      // const url = new URL(props[0].url);
      response.headers.set("Access-Control-Allow-Origin", "*");

      // Append to/Add Vary header so browser will cache response correctly
      response.headers.append("Vary", "Origin");

      return response;
    } catch (e) {
      console.log("error", e);
      return new Response("Error", {
        status: e.status,
        statusText: e.statusText,
      });
    }
  },
};
