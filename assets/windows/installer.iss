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
Name: "en"; MessagesFile: "compiler:Default.isl"
; Official languages
Name: "ca"; MessagesFile: "compiler:Languages\Catalan.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"
Name: "ja"; MessagesFile: "compiler:Languages\Japanese.isl"
Name: "nl"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "pt"; MessagesFile: "compiler:Languages\Portuguese.isl"
Name: "pl"; MessagesFile: "compiler:Languages\Polish.isl"
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"
; Not official. Sometimes not updated to latest version (strings missing)
Name: "ga"; MessagesFile: "unofficial_inno_languages\Galician.isl"
Name: "eu"; MessagesFile: "unofficial_inno_languages\Basque.isl"
Name: "hr"; MessagesFile: "unofficial_inno_languages\Croatian.isl"
Name: "hu"; MessagesFile: "unofficial_inno_languages\Hungarian.isl"
Name: "id"; MessagesFile: "unofficial_inno_languages\Indonesian.isl"
Name: "ko"; MessagesFile: "unofficial_inno_languages\Korean.isl"
Name: "lv"; MessagesFile: "unofficial_inno_languages\Latvian.isl"
Name: "sv"; MessagesFile: "unofficial_inno_languages\Swedish.isl"
Name: "zh_CN"; MessagesFile: "unofficial_inno_languages\ChineseSimplified.isl"
Name: "zh_TW"; MessagesFile: "unofficial_inno_languages\ChineseTraditional.isl"
; Not available
; pt_BR (Portuguese Brasileiro)

[Run]
Filename: "pnputil.exe"; Parameters: "/add-driver ""{tmp}\stm32\STtube.inf"" /install"; StatusMsg: "Installing STM32 DFU driver..."; Check: WizardIsTaskSelected('install_stm_dfu') and STMDFULicenseAccepted; Flags: runhidden waituntilterminated
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
            MsgBox('Error uninstalling Configurator ' + SysErrorMessage(ResultCode) + '.', mbError, MB_OK);
        end;
    end;
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
      'STM32 DFU Driver License',
      'Review and accept the STMicroelectronics driver license.',
      'The STM32 DFU driver is optional. To install it, you must accept the STMicroelectronics driver license.',
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
    'I accept the STMicroelectronics driver license';
  STMDFULicenseNotAcceptedRadio.Caption :=
    'I do not accept the STMicroelectronics driver license';

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
        'You must accept the STMicroelectronics driver license to install the STM32 DFU driver.',
        mbError,
        MB_OK
      );
      Result := False;
    end;
  end;
end;

[Tasks]
Name: "install_stm_dfu"; Description: "Install STM32 DFU driver for Windows flashing (optional)"; Flags: unchecked