# Testing Guideline for aarch64

## Currently

### Raspberry Pi 3B by running Nbl.Desktop directly
I have tested it on a Raspberry Pi 3B and it worked as expected, no sound.

The memory of my RPi 3B is just 1 GB and the power is not so stable, so I did not test it through flatpak directly.

### Testing through Github Action
This is used to test the aarch64 build through Github Actions to see whether it will crash during startup.
This one does not really test the functionality of the application.
Queuing the aarch64 build and test workflow.

## Need Your Help
If you have an aarch64 device, please help test the Flatpak build and check whether the application works as expected.

### Needed
- An aarch64 device with Flatpak installed.
- 4 files or you can cd to this folder (Remember, this is on the branch `feature/flatpak` not `main`):
    * [io.github.ychsue.nonblockinglife.yml](./io.github.ychsue.nonblockinglife.yml)
    * [nuget-sources.json](./nuget-sources.json)
    * [nuget-sources-x86_64.json](./nuget-sources-x86_64.json)
    * [nuget-sources-aarch64.json](./nuget-sources-aarch64.json)

### Steps
1. Open a terminal and change to this folder:
   ```bash
   cd desktop/flatpak-aarch64-test
   ```
2. Build the Flatpak:
   ```bash
   flatpak run org.flatpak.Builder --force-clean build-dir io.github.ychsue.nonblockinglife.yml
   ```
3. Install the Flatpak:
   ```bash
   flatpak run --command=flathub-build org.flatpak.Builder --install io.github.ychsue.nonblockinglife.yml
   ```
4. Run the application:
   ```bash
   flatpak run io.github.ychsue.nonblockinglife
   ```

### Verification
1. Make sure every step works without errors.
    * If it has any errors, please report them along with the step where they occurred.
2. Once the application starts, make sure it works as expected.
    * You can try to open the ClockWindow to check whether it displays correctly and can play audios.
    * You can test adding 👉 at the end of the title of a task with a url. Once you start this task by clicking it in the candidate page, the application should open the url in your default browser or do some actions.
        - About this part, I'll make a video to show how to test it.