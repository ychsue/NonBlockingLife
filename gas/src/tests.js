import { handleStart, handleEnd, handleQueryOptions } from "./Logic.js";

function testHandleStart() {
  handleStart("Sc", "This is a test");
}

function testHandleEnd() {
  handleEnd("It's time to stop.");
}

function testIsoString() {
  const now = new Date();
  Logger.log(now.toISOString());
}

function testHandleQueryOptions() {
  const result = handleQueryOptions();
  Logger.log(JSON.stringify(result, null, 2));
}

function testAddScheduledTask() {
  const result = handleAddScheduledTask(
    "Test Scheduled Task",
    new Date(Date.now() + 3600 * 1000).toISOString(),
    15,
    "This is a test scheduled task."
  );
  Logger.log(JSON.stringify(result, null, 2));
}