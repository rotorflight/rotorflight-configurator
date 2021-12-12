## Snapshot Release

This is a Rotorflight Configurator development snapshot for beta-testing.

This snapshot contains a **major** code restructuring, mostly in the tab
code and in the MSP handling.

The Save/Reboot/Refresh functionality has been totally rewritten,
to be consistent between tabs. Now, Save and Revert buttons are
presented if there are any changes in a tab. Also, a warning dialog
is presented if the user is trying to swap tabs while there are unsaved
changes. Also, all data is refreshed from the FC after saving, for making
sure everything actually is saved in the FC correctly.

**NOTE!** Please uninstall any previous version of Rotorflight Configurator
before trying to install this version!


## Changes from 20211224

- Warning dialog about Unsaved Changes added

- Save functionality rewritten in all tabs

- Lots of dead code removed

- Backup/Restore buttons removed in the System tab

- MSP Changes to match the Firmware

- Gear ratio moved from Governor to Motor config

- Show degrees in Mixer tab

- Front/Rear elevator servo mixup fixed in the Mixer

- App id clash with Betaflight fixed

- Use decimal format for (1/10s) time variables

- Initial bidirectional tail support added

- Tabs reordered again

- No more snowstorm ;-)

