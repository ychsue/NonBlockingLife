function testHandleStart() {
  handleStart("Sc","This is a test");
}

function testHandleEnd() {
  handleEnd("It's time to stop.");
}

function testIsoString() {
  const now = new Date();
  Logger.log(now.toISOString());
}