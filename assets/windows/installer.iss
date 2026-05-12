; ------------------------------------------
; Installer for Rotorflight Configurator
; ------------------------------------------
; It receives from the command line with /D the parameters:
; version
; archName
; archAllowed
; archInstallIn64bit
; sourceFolder
; targetFolder

#define ApplicationName "Rotorflight Configurator"
#define CompanyName "The Rotorflight open source project"
#define CompanyUrl "https://github.com/rotorflight/"
#define ExecutableFileName "rotorflight-configurator.exe"
#define GroupName "Rotorflight"
#define InstallerFileName "rotorflight-configurator-installer_" + version + "_" + archName
#define SourcePath "..\..\" + sourceFolder
#define TargetFolderName "Rotorflight-Configurator"
#define UpdatesUrl "https://github.com/rotorflight/rotorflight-configurator/releases"

[CustomMessages]
AppName=rotorflight-configurator
LaunchProgram=Start {#ApplicationName}
UninstallError=Error uninstalling Configurator %1.

[Files]
Source: "{#SourcePath}\*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "..\..\assets\windows\drivers\stm32-winusb\*"; DestDir: "{tmp}\stm32-winusb"; Flags: recursesubdirs deleteafterinstall
Source: "..\..\assets\windows\drivers\stm32-winusb\license\libusb0\installer_license.txt"; DestName: "stm32_winusb_driver_license.txt"; Flags: dontcopy

[Icons]
; Programs group
Name: "{group}\{#ApplicationName}"; Filename: "{app}\{#ExecutableFileName}";
; Desktop icon
Name: "{autodesktop}\{#ApplicationName}"; Filename: "{app}\{#ExecutableFileName}";
; Non admin users, uninstall icon
Name: "{group}\Uninstall {#ApplicationName}"; Filename: "{uninstallexe}"; Check: not IsAdminInstallMode

[Languages]
; English default, it must be first
Name: "en"; MessagesFile: "..\..\assets\windows\languages\Default.isl"
; Official languages and local custom message copies
Name: "ca"; MessagesFile: "..\..\assets\windows\languages\Catalan.isl"
Name: "de"; MessagesFile: "..\..\assets\windows\languages\German.isl"
Name: "es"; MessagesFile: "..\..\assets\windows\languages\Spanish.isl"
Name: "fr"; MessagesFile: "..\..\assets\windows\languages\French.isl"
Name: "it"; MessagesFile: "..\..\assets\windows\languages\Italian.isl"
Name: "ja"; MessagesFile: "..\..\assets\windows\languages\Japanese.isl"
Name: "nl"; MessagesFile: "..\..\assets\windows\languages\Dutch.isl"
Name: "pt"; MessagesFile: "..\..\assets\windows\languages\Portuguese.isl"
Name: "pl"; MessagesFile: "..\..\assets\windows\languages\Polish.isl"
Name: "ru"; MessagesFile: "..\..\assets\windows\languages\Russian.isl"
Name: "ga"; MessagesFile: "..\..\assets\windows\languages\Galician.isl"
Name: "eu"; MessagesFile: "..\..\assets\windows\languages\Basque.isl"
Name: "hr"; MessagesFile: "..\..\assets\windows\languages\Croatian.isl"
Name: "hu"; MessagesFile: "..\..\assets\windows\languages\Hungarian.isl"
Name: "id"; MessagesFile: "..\..\assets\windows\languages\Indonesian.isl"
Name: "ko"; MessagesFile: "..\..\assets\windows\languages\Korean.isl"
Name: "lv"; MessagesFile: "..\..\assets\windows\languages\Latvian.isl"
Name: "sv"; MessagesFile: "..\..\assets\windows\languages\Swedish.isl"
Name: "zh_CN"; MessagesFile: "..\..\assets\windows\languages\ChineseSimplified.isl"
Name: "zh_TW"; MessagesFile: "..\..\assets\windows\languages\ChineseTraditional.isl"
; Not available
; pt_BR (Portuguese Brasileiro)

[Run]
Filename: "pnputil.exe"; Parameters: "/add-driver ""{tmp}\stm32-winusb\STM32_BOOTLOADER.inf"" /install"; StatusMsg: "Installing STM32 BOOTLOADER WinUSB driver..."; Check: WizardIsTaskSelected('install_stm_winusb') and STMWinUSBLicenseAccepted; Flags: runhidden waituntilterminated
Filename: {app}\{cm:AppName}.exe; Description: {cm:LaunchProgram,{cm:AppName}}; Flags: nowait postinstall skipifsilent

[Setup]
AppId=0f5aab69-da40-4828-8efc-34d4bbb075fe
AppName={#ApplicationName}
AppPublisher={#CompanyName}
AppPublisherURL={#CompanyUrl}
AppUpdatesURL={#UpdatesUrl}
AppVersion={#version}
ArchitecturesAllowed={#archAllowed}
ArchitecturesInstallIn64BitMode={#archInstallIn64bit}
Compression=lzma2
DefaultDirName={autopf}\{#GroupName}\{#TargetFolderName}
DefaultGroupName={#GroupName}\{#ApplicationName}
LicenseFile=..\..\LICENSE
MinVersion=6.2
OutputBaseFilename={#InstallerFileName}
OutputDir=..\..\{#targetFolder}\
PrivilegesRequiredOverridesAllowed=commandline dialog
SetupIconFile=rf_installer_icon.ico
ShowLanguageDialog=yes
SolidCompression=yes
UninstallDisplayIcon={app}\{#ExecutableFileName}
UninstallDisplayName={#ApplicationName}
WizardImageFile=rf_installer.bmp
WizardSmallImageFile=rf_installer_small.bmp
WizardStyle=modern
PrivilegesRequired=admin

[Code]
function GetQuietUninstallerPath(): String;
var
    RegKey: String;
begin
    Result := '';
    RegKey := Format('%s\%s_is1', ['Software\Microsoft\Windows\CurrentVersion\Uninstall', '{#emit SetupSetting("AppId")}']);
    if not RegQueryStringValue(HKEY_LOCAL_MACHINE, RegKey, 'QuietUninstallString', Result) then
    begin
        RegQueryStringValue(HKEY_CURRENT_USER, RegKey, 'QuietUninstallString', Result);
    end;
end;

function InitializeSetup(): Boolean;
var
    ResultCode: Integer;
    UninstPath : String;
begin

    Result := True;

    // Search for new Inno Setup installations
    UninstPath := GetQuietUninstallerPath();
    if UninstPath <> '' then
    begin
        if not Exec('>', UninstPath, '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
        begin
            // Result := False; // Set to False to abort the installation
            MsgBox(ExpandConstant('{cm:UninstallError, ' + SysErrorMessage(ResultCode) + '}'), mbError, MB_OK);
        end;
    end;
end;

var
  STMWinUSBLicensePage: TOutputMsgMemoWizardPage;
  STMWinUSBLicenseAcceptedRadio: TRadioButton;
  STMWinUSBLicenseNotAcceptedRadio: TRadioButton;
  STMWinUSBLicenseAcceptedState: Boolean;

function STMWinUSBLicenseAccepted(): Boolean;
begin
  Result := STMWinUSBLicenseAcceptedState;
end;

procedure CheckSTMWinUSBLicenseAccepted(Sender: TObject);
begin
  WizardForm.NextButton.Enabled := STMWinUSBLicenseAcceptedRadio.Checked;
end;

procedure PositionSTMWinUSBLicenseControls;
var
  MemoHeight: Integer;
begin
  if STMWinUSBLicensePage = nil then
    Exit;

  STMWinUSBLicensePage.RichEditViewer.Left := 0;
  STMWinUSBLicensePage.RichEditViewer.Top := ScaleY(60);
  STMWinUSBLicensePage.RichEditViewer.Width := STMWinUSBLicensePage.SurfaceWidth;

  STMWinUSBLicenseAcceptedRadio.Left := 0;
  STMWinUSBLicenseAcceptedRadio.Width := STMWinUSBLicensePage.SurfaceWidth;
  STMWinUSBLicenseNotAcceptedRadio.Left := 0;
  STMWinUSBLicenseNotAcceptedRadio.Width := STMWinUSBLicensePage.SurfaceWidth;

  MemoHeight :=
    STMWinUSBLicensePage.SurfaceHeight -
    STMWinUSBLicensePage.RichEditViewer.Top -
    STMWinUSBLicenseAcceptedRadio.Height -
    STMWinUSBLicenseNotAcceptedRadio.Height -
    ScaleY(28);
  if MemoHeight < ScaleY(60) then
    MemoHeight := ScaleY(60);
  STMWinUSBLicensePage.RichEditViewer.Height := MemoHeight;

  STMWinUSBLicenseAcceptedRadio.Top :=
    STMWinUSBLicensePage.RichEditViewer.Top +
    STMWinUSBLicensePage.RichEditViewer.Height + ScaleY(8);
  STMWinUSBLicenseNotAcceptedRadio.Top :=
    STMWinUSBLicenseAcceptedRadio.Top +
    STMWinUSBLicenseAcceptedRadio.Height + ScaleY(4);

  STMWinUSBLicensePage.RichEditViewer.SendToBack;
  STMWinUSBLicenseAcceptedRadio.BringToFront;
  STMWinUSBLicenseNotAcceptedRadio.BringToFront;
end;

function CloneLicenseRadioButton(Source: TRadioButton): TRadioButton;
begin
  Result := TRadioButton.Create(WizardForm);
  Result.Parent := STMWinUSBLicensePage.Surface;
  Result.Caption := Source.Caption;
  Result.Left := Source.Left;
  Result.Top := Source.Top;
  Result.Width := Source.Width;
  Result.Height := Source.Height;
  Result.OnClick := @CheckSTMWinUSBLicenseAccepted;
end;

procedure InitializeWizard();
var
  LicenseFilePath: String;
begin
  STMWinUSBLicenseAcceptedState := False;

  STMWinUSBLicensePage :=
    CreateOutputMsgMemoPage(
      wpSelectTasks,
      SetupMessage(msgWizardLicense),
      SetupMessage(msgLicenseLabel),
      SetupMessage(msgLicenseLabel3),
      ''
    );

  ExtractTemporaryFile('stm32_winusb_driver_license.txt');
  LicenseFilePath := ExpandConstant('{tmp}\stm32_winusb_driver_license.txt');
  STMWinUSBLicensePage.RichEditViewer.Lines.LoadFromFile(LicenseFilePath);
  DeleteFile(LicenseFilePath);

  // create radios before final layout so we can reserve space correctly
  STMWinUSBLicenseAcceptedRadio :=
    CloneLicenseRadioButton(WizardForm.LicenseAcceptedRadio);
  STMWinUSBLicenseNotAcceptedRadio :=
    CloneLicenseRadioButton(WizardForm.LicenseNotAcceptedRadio);

  // captions
  STMWinUSBLicenseAcceptedRadio.Caption :=
    SetupMessage(msgLicenseAccepted);
  STMWinUSBLicenseNotAcceptedRadio.Caption :=
    SetupMessage(msgLicenseNotAccepted);

  // default state
  STMWinUSBLicenseNotAcceptedRadio.Checked := True;

  PositionSTMWinUSBLicenseControls;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;

  if PageID = STMWinUSBLicensePage.ID then
  begin
    Result := not WizardIsTaskSelected('install_stm_winusb');
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = STMWinUSBLicensePage.ID then
  begin
    PositionSTMWinUSBLicenseControls;
    CheckSTMWinUSBLicenseAccepted(nil);
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = STMWinUSBLicensePage.ID then
  begin
    STMWinUSBLicenseAcceptedState := STMWinUSBLicenseAcceptedRadio.Checked;

    if not STMWinUSBLicenseAcceptedState then
    begin
      MsgBox(
        SetupMessage(msgCannotContinue),
        mbError,
        MB_OK
      );
      Result := False;
    end;
  end;
end;

[Tasks]
Name: "install_stm_winusb"; Description: "{cm:STDFUDriverTaskDesc}"