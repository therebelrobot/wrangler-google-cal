import secrets from "./secrets.json";
const baseUrl = "https://www.googleapis.com/calendar/v3/calendars/";
const calendarIds = [
  {
    id: secrets.calendarId,
    description: "coven",
  },
];
const resource = "/events";
const apiKey = secrets.apiKey;

export default { baseUrl, calendarIds, resource, apiKey };
