; ------------------------------------------
; Installer for Rotorflight Configurator
; ------------------------------------------
; It receives from the command line with /D the parameters:
; version
; channel (the release line, e.g. 2.3, or dev; see release-channel.mjs)
; archName
; archAllowed
; archInstallIn64bit
; sourceFolder
; targetFolder

; Every release line installs side by side with the others: it has its own
; AppId, folder and shortcuts, and only replaces an install of the same line,
; including one from before the lines (see InitializeSetup).
#if channel == "dev"
  #define ApplicationName "Rotorflight Configurator (dev)"
#else
  #define ApplicationName "Rotorflight Configurator " + channel
#endif
#define CompanyName "The Rotorflight open source project"
#define CompanyUrl "https://github.com/rotorflight/"
#define ExecutableFileName "rotorflight-configurator.exe"
#define GroupName "Rotorflight"
#define InstallerFileName "rotorflight-configurator-installer_" + version + "_" + archName
#define SourcePath "..\..\" + sourceFolder
#define TargetFolderName "Rotorflight-Configurator-" + channel
#define UpdatesUrl "https://github.com/rotorflight/rotorflight-configurator/releases"

[CustomMessages]
AppName=rotorflight-configurator
LaunchProgram=Start {#ApplicationName}
UninstallError=Error uninstalling Configurator %1.

[Files]
Source: "{#SourcePath}\*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "..\..\assets\windows\drivers\stm32\*"; DestDir: "{tmp}\stm32"; Flags: recursesubdirs deleteafterinstall
Source: "..\..\assets\windows\drivers\stm32\license.txt"; DestName: "stm32_driver_license.txt"; Flags: dontcopy

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
Filename: "pnputil.exe"; Parameters: "/add-driver ""{tmp}\stm32\STM32Bootloader.inf"" /install"; StatusMsg: "Installing STM32 DFU driver..."; Check: WizardIsTaskSelected('install_stm_dfu') and STMDFULicenseAccepted; Flags: runhidden waituntilterminated
Filename: {app}\{cm:AppName}.exe; Description: {cm:LaunchProgram,{cm:AppName}}; Flags: nowait postinstall skipifsilent

[Setup]
AppId=rotorflight-configurator-{#channel}
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
const
    // Before the release lines, every install had this AppId.
    LegacyAppId = '0f5aab69-da40-4828-8efc-34d4bbb075fe';

procedure Uninstall(UninstPath: String);
var
    ResultCode: Integer;
begin
    if not Exec('>', UninstPath, '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
    begin
        MsgBox(ExpandConstant('{cm:UninstallError, ' + SysErrorMessage(ResultCode) + '}'), mbError, MB_OK);
    end;
end;

// Whether a version is of this release line; see release-channel.mjs.
function IsThisLine(Version: String): Boolean;
begin
    Result := Pos('{#channel}.', Version) = 1;
end;

// Uninstalls the install of AppId registered under RootKey, if there is one
// and, when OnlyThisLine is set, it is of this release line.
procedure UninstallFrom(RootKey: Integer; AppId: String; OnlyThisLine: Boolean);
var
    RegKey, UninstPath, Version: String;
begin
    RegKey := Format('%s\%s_is1', ['Software\Microsoft\Windows\CurrentVersion\Uninstall', AppId]);
    if RegQueryStringValue(RootKey, RegKey, 'QuietUninstallString', UninstPath) then
    begin
        Version := '';
        RegQueryStringValue(RootKey, RegKey, 'DisplayVersion', Version);
        if (not OnlyThisLine) or IsThisLine(Version) then
        begin
            Uninstall(UninstPath);
        end;
    end;
end;

// x86 and x64 builds register in different registry views, so an install of
// one may sit next to the other's: look in both, and for a per-user install.
procedure UninstallEverywhere(AppId: String; OnlyThisLine: Boolean);
begin
    UninstallFrom(HKLM32, AppId, OnlyThisLine);
    if IsWin64 then
    begin
        UninstallFrom(HKLM64, AppId, OnlyThisLine);
    end;
    UninstallFrom(HKCU, AppId, OnlyThisLine);
end;

function InitializeSetup(): Boolean;
begin
    Result := True;

    // An earlier install of this line
    UninstallEverywhere('{#emit SetupSetting("AppId")}', False);

    // An install from before the release lines, if it is of this line
    UninstallEverywhere(LegacyAppId, True);
end;

var
  STMDFULicensePage: TOutputMsgMemoWizardPage;
  STMDFULicenseAcceptedRadio: TRadioButton;
  STMDFULicenseNotAcceptedRadio: TRadioButton;
  STMDFULicenseAcceptedState: Boolean;

function STMDFULicenseAccepted(): Boolean;
begin
  Result := STMDFULicenseAcceptedState;
end;

procedure CheckSTMDFULicenseAccepted(Sender: TObject);
begin
  WizardForm.NextButton.Enabled := STMDFULicenseAcceptedRadio.Checked;
end;

procedure PositionSTMDFULicenseControls;
var
  MemoHeight: Integer;
begin
  if STMDFULicensePage = nil then
    Exit;

  STMDFULicensePage.RichEditViewer.Left := 0;
  STMDFULicensePage.RichEditViewer.Top := ScaleY(60);
  STMDFULicensePage.RichEditViewer.Width := STMDFULicensePage.SurfaceWidth;

  STMDFULicenseAcceptedRadio.Left := 0;
  STMDFULicenseAcceptedRadio.Width := STMDFULicensePage.SurfaceWidth;
  STMDFULicenseNotAcceptedRadio.Left := 0;
  STMDFULicenseNotAcceptedRadio.Width := STMDFULicensePage.SurfaceWidth;

  MemoHeight :=
    STMDFULicensePage.SurfaceHeight -
    STMDFULicensePage.RichEditViewer.Top -
    STMDFULicenseAcceptedRadio.Height -
    STMDFULicenseNotAcceptedRadio.Height -
    ScaleY(28);
  if MemoHeight < ScaleY(60) then
    MemoHeight := ScaleY(60);
  STMDFULicensePage.RichEditViewer.Height := MemoHeight;

  STMDFULicenseAcceptedRadio.Top :=
    STMDFULicensePage.RichEditViewer.Top +
    STMDFULicensePage.RichEditViewer.Height + ScaleY(8);
  STMDFULicenseNotAcceptedRadio.Top :=
    STMDFULicenseAcceptedRadio.Top +
    STMDFULicenseAcceptedRadio.Height + ScaleY(4);

  STMDFULicensePage.RichEditViewer.SendToBack;
  STMDFULicenseAcceptedRadio.BringToFront;
  STMDFULicenseNotAcceptedRadio.BringToFront;
end;

function CloneLicenseRadioButton(Source: TRadioButton): TRadioButton;
begin
  Result := TRadioButton.Create(WizardForm);
  Result.Parent := STMDFULicensePage.Surface;
  Result.Caption := Source.Caption;
  Result.Left := Source.Left;
  Result.Top := Source.Top;
  Result.Width := Source.Width;
  Result.Height := Source.Height;
  Result.OnClick := @CheckSTMDFULicenseAccepted;
end;

procedure InitializeWizard();
var
  LicenseFilePath: String;
begin
  STMDFULicenseAcceptedState := False;

  STMDFULicensePage :=
    CreateOutputMsgMemoPage(
      wpSelectTasks,
      SetupMessage(msgWizardLicense),
      SetupMessage(msgLicenseLabel),
      SetupMessage(msgLicenseLabel3),
      ''
    );

  ExtractTemporaryFile('stm32_driver_license.txt');
  LicenseFilePath := ExpandConstant('{tmp}\stm32_driver_license.txt');
  STMDFULicensePage.RichEditViewer.Lines.LoadFromFile(LicenseFilePath);
  DeleteFile(LicenseFilePath);

  // create radios before final layout so we can reserve space correctly
  STMDFULicenseAcceptedRadio :=
    CloneLicenseRadioButton(WizardForm.LicenseAcceptedRadio);
  STMDFULicenseNotAcceptedRadio :=
    CloneLicenseRadioButton(WizardForm.LicenseNotAcceptedRadio);

  // captions
  STMDFULicenseAcceptedRadio.Caption :=
    SetupMessage(msgLicenseAccepted);
  STMDFULicenseNotAcceptedRadio.Caption :=
    SetupMessage(msgLicenseNotAccepted);

  // default state
  STMDFULicenseNotAcceptedRadio.Checked := True;

  PositionSTMDFULicenseControls;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;

  if PageID = STMDFULicensePage.ID then
  begin
    Result := not WizardIsTaskSelected('install_stm_dfu');
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = STMDFULicensePage.ID then
  begin
    PositionSTMDFULicenseControls;
    CheckSTMDFULicenseAccepted(nil);
  end;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  if CurPageID = STMDFULicensePage.ID then
  begin
    STMDFULicenseAcceptedState := STMDFULicenseAcceptedRadio.Checked;

    if not STMDFULicenseAcceptedState then
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
Name: "install_stm_dfu"; Description: "{cm:STDFUDriverTaskDesc}"