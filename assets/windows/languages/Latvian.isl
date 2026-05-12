;Agris Ausejs 
;******************************************************
; ***                                                ***
; *** Inno Setup version 5.5.1+ Latvian messages    ***
; ***                                                ***
; *** Original Author:                               ***
; ***                                                ***
; ***   Agris Ausejs (oby2005@gmail.com)             ***
; ***                                                ***
; ***  02/22/2008                                    ***
; ******************************************************
;
;
; To download user-contributed translations of this file, go to:
;   http://www.jrsoftware.org/is3rdparty.php
;
; Note: When translating this text, do not add periods (.) to the end of
; messages that didn't have them already, because on those messages Inno
; Setup adds the periods automatically (appending a period would result in
; two periods being displayed).

[LangOptions]
; The following three entries are very important. Be sure to read and 
; understand the '[LangOptions] section' topic in the help file.
LanguageName=Latviski
LanguageID=$0426
LanguageCodePage=1257
; If the language you are translating to requires special font faces or
; sizes, uncomment any of the following entries and change them accordingly.
;DialogFontName=
;DialogFontSize=8
;WelcomeFontName=Verdana
;WelcomeFontSize=12
;TitleFontName=Arial
;TitleFontSize=29
;CopyrightFontName=Arial
;CopyrightFontSize=8

[Messages]

; *** Application titles
SetupAppTitle=Uzst�d��ana
SetupWindowTitle=Uzst�d��ana - %1
UninstallAppTitle=Atinstal�cija
UninstallAppFullTitle=%1 Atinstal�cija

; *** Misc. common
InformationTitle=Inform�cija
ConfirmTitle=Apstiprin�t
ErrorTitle=K��da

; *** SetupLdr messages
SetupLdrStartupMessage=Tiks uzst�d�ta programma %1. Vai v�laties turpin�t?
LdrCannotCreateTemp=Neiesp�jami izveidot pagaidu datnes. Uzst�d��ana p�rtraukta
LdrCannotExecTemp=Neiesp�jami palaist datni no pagaidu mapes. Uzst�d��ana p�rtraukta

; *** Startup error messages
LastErrorMessage=%1.%n%nK��da %2: %3
SetupFileMissing=Datne %1 nav atrodama instal�cijas map�. L�dzu, izlabojiet k��du vai ieg�d�jieties jaunu programmas kopiju.
SetupFileCorrupt=Uzst�d�m�s datnes ir saboj�tas. L�dzu, ieg�d�jieties jaunu programmas kopiju.
SetupFileCorruptOrWrongVer=Uzst�d�m�s datnes ir boj�tas vai nav savienojamas ar �o Uzst�d��anas programmu. L�dzu, izlabojiet �o k��du vai ieg�d�jieties jaunu programmas kopiju.
InvalidParameter=Neder�gs parametrs tika pie�emts uz komandrindas:%n%n%1
SetupAlreadyRunning=Uzst�d��ana jau darbojas.
WindowsVersionNotSupported=�� programma neatbalsta Windows versiju dator� darbojas.
WindowsServicePackRequired=�� programma pieprasa %1 servisa pakotnes %2 vai jaun�ka.
NotOnThisPlatform=�o programmu nevar palaist uz %1.
OnlyOnThisPlatform=�� programma darbojas uz %1.
OnlyOnTheseArchitectures=�o programmu var uzst�d�t tikai uz ��d�m Windows versij�m:%n%n%1
MissingWOW64APIs=Pa�laik palaist� Windows versija neatbalsta 64-bitu instal�ciju. Lai izlabotu �o k��du, uzinstal�jiet Service Pack %1.
WinVersionTooLowError=�� programma pieprasa %1 versiju %2 vai jaun�ku.
WinVersionTooHighError=�o programmu nevar uzst�d�t uz %1 versijas %2 vai jaun�kas.
AdminPrivilegesRequired=Jums ir j�b�t adminstratoram, lai var�tu uzs�kt instal�ciju.
PowerUserPrivilegesRequired=Jums ir j�b�t administratoram vai pilnvarotam lietot�jam, lai uzst�d�tu �o programmu.
SetupAppRunningError=Uzst�d��ana ir atkl�jusi, ka %1 pa�laik darbojas.%n%nL�dzu, aizveriet visas programmas un spiediet "Ok" vai "Atcelt", lai izietu.
UninstallAppRunningError=Atinstal�cija ir atkl�jusi ka %1 pa�laik darbojas.%n%nL�dzu, aizveriet visas programmas un spiediet "Ok", lai turpin�tu, vai "Atcelt", lai izietu.

; *** Misc. errors
ErrorCreatingDir=Uzst�d��an� ir neiesp�jami izveidot mapi "%1"
ErrorTooManyFilesInDir=Neiesp�jami izveidot datnes map� "%1", jo t� satur p�r�k daudz dat�u

; *** Setup common messages
ExitSetupTitle=Iziet no Uzst�d��anas
ExitSetupMessage=Uzst�d��ana nav pabeigta. Ja J�s tagad iziesiet, tad programma netiks uzinstal�ta.%n%nJums b�s atkal j�palai� Uzst�d��ana, lai pabeigtu programmas instal�ciju.%n%nIziet no Uzst�d��anas?
AboutSetupMenuItem=&Par Uzst�d��anu...
AboutSetupTitle=Par Uzst�d��anu
AboutSetupMessage=%1 versija %2%n%3%n%n%1 m�jas lapa:%n%4
AboutSetupNote=
TranslatorNote=

; *** Buttons
ButtonBack=< &Atpaka�
ButtonNext=&T�l�k >
ButtonInstall=&Uzst�d�t
ButtonOK=OK
ButtonCancel=Atcelt
ButtonYes=&J�
ButtonYesToAll=J� &Visam
ButtonNo=&N�
ButtonNoToAll=N� V&isam
ButtonFinish=&Pabeigt
ButtonBrowse=P�&rl�kot...
ButtonWizardBrowse=P�rl�&kot...
ButtonNewFolder=I&zveidot jaunu mapi

; *** "Select Language" dialog messages
SelectLanguageTitle=Izv�lieties Uzst�d��anas valodu
SelectLanguageLabel=Izv�lieties valodu, kur� notiks Uzst�d��ana:

; *** Common wizard text
ClickNext=Spiediet "T�l�k", lai turpin�tu, vai "Atcelt", lai izietu no Uzst�d��anas.
BeveledLabel=
BrowseDialogTitle=P�rl�kot mapi
BrowseDialogLabel=Izv�lieties mapi no saraksta, tad spiediet "Ok".
NewFolderName=Jauna mape

; *** "Welcome" wizard page
WelcomeLabel1=Laipni l�dzam [name] Uzst�d��an�
WelcomeLabel2=�is uzst�d�s [name/ver] uz J�su datora.%n%nV�lams aizv�rt visas programmas pirms turpin��anas.

; *** "Password" wizard page
WizardPassword=Parole
PasswordLabel1=�� instal�cija ir aizsarg�ta ar paroli.
PasswordLabel3=L�dzu, ievadiet paroli, tad spiediet "T�l�k", lai turpin�tu. Parole ir re�istrjut�ga.
PasswordEditLabel=&Parole:
IncorrectPassword=Parole, ko J�s ievad�j�t, ir nepareiza. L�dzu, m��iniet v�lreiz.

; *** "License Agreement" wizard page
WizardLicense=L�gums
LicenseLabel=L�dzu, izlasiet sekojo�o inform�ciju, pirms turpin�t.
LicenseLabel3=L�dzu, izlasiet L�gumu. Jums ir j�apstiprina L�gums, lai turpin�tu instal�ciju.
LicenseAccepted=Es &piekr�tu l�gumam
LicenseNotAccepted=Es &nepiekr�tu l�gumam

; *** "Information" wizard pages
WizardInfoBefore=Inform�cija
InfoBeforeLabel=L�dzu, izlasiet �o inform�ciju.
InfoBeforeClickLabel=Kad esat gatavs turpin�t instal�ciju, spiediet "T�l�k".
WizardInfoAfter=Inform�cija
InfoAfterLabel=L�dzu izlasiet sekojo�o inform�ciju.
InfoAfterClickLabel=Kad esat gatavs turpin�t instal�ciju, spiediet "T�l�k".

; *** "User Information" wizard page
WizardUserInfo=Lietot�ja inform�cija
UserInfoDesc=L�dzu, ievadiet savu inform�ciju.
UserInfoName=&Lietot�ja v�rds:
UserInfoOrg=&Organiz�cija:
UserInfoSerial=&Seri�lais numurs:
UserInfoNameRequired=Jums ir j�ievada savs v�rds.

; *** "Select Destination Location" wizard page
WizardSelectDir=Izv�lieties mapi, uz kuru tiks s�t�ti dati
SelectDirDesc=Kur [name] tiks instal�ts?
SelectDirLabel3=[name] datnes tiks instal�tas nor�d�taj� map�.
SelectDirBrowseLabel=Lai turpin�tu, spiediet "T�l�k". Ja v�laties nor�d�t citu mapi, spiediet "P�rl�kot".
DiskSpaceMBLabel=Ir nepiecie�ami br�vi [mb] MB uz ciet� diska.
CannotInstallToNetworkDrive=Iestat��ana nevar instal�t ar t�kla disku.
CannotInstallToUNCPath=Iestat��ana nevar uzst�d�t uz UNC ce�u.
InvalidPath=Jums ir j�nor�da pilna instal�cijas adrese, piem�rs:%n%nC:\APP%n%nvai  UNC adrese:%n%n\\server\share
InvalidDrive=Ier�ce UNC, kuru J�s izv�l�j�ties, nepast�v vai ar� nav pieejama. L�dzu, izv�lieties citu.
DiskSpaceWarningTitle=Nepietiek vietas uz diska
DiskSpaceWarning=Instal�cijai ir nepiecie�ami vismaz %1 KB br�v�s vietas uz diska, bet pieejami ir tikai %2 KB.%n%nVai v�laties turpin�t?
DirNameTooLong=Mapes nosaukums vai adrese ir p�r�k gara.
InvalidDirName=Mapes nosaukums nav der�gs.
BadDirName32=Mapes nosaukum� nedr�kst b�t ��di simboli:%n%n%1
DirExistsTitle=Mape jau past�v
DirExists=Mape:%n%n%1%n%njau past�v. Vai vienalga v�laties turpin�t?
DirDoesntExistTitle=Mape nepast�v
DirDoesntExist=Mape:%n%n%1%n%ndoes nepast�v. Vai v�laties izveidot mapi?

; *** "Select Components" wizard page
WizardSelectComponents=Izv�lieties sast�vda�as
SelectComponentsDesc=Kurus komponentus v�laties uzst�d�t?
SelectComponentsLabel2=Izv�lieties komponentus, kurus v�laties uzst�d�t. Spiediet "T�l�k", lai turpin�tu.
FullInstallation=Pilna Uzst�d��ana
; if possible don't translate 'Compact' as 'Minimal' (I mean 'Minimal' in your language)
CompactInstallation=Kompakta Uzst�d��ana
CustomInstallation=Izveidot Uzst�d��anu
NoUninstallWarningTitle=Komponenti jau past�v
NoUninstallWarning=Uzst�d��ana ir atkl�jusi ka ��di faili jau ir uzst�d�ti:%n%n%1%n%nAtiestatiet �os komponentus.%n%nVai v�laties turpin�t?
ComponentSize1=%1 KB
ComponentSize2=%1 MB
ComponentsDiskSpaceMBLabel=Pa�laik izv�l�tie komponenti aiz�em [mb] MB uz ciet� diska.

; *** "Select Additional Tasks" wizard page
WizardSelectTasks=Papilduzdevumu izv�lne
SelectTasksDesc=Kurus papilduzdevumus vajadz�tu veikt?
SelectTasksLabel2=Izv�lieties, k�di papilduzdevumi tiks veikti [name] Uzst�d��anas laik�, tad spiediet "T�l�k".

; *** "Select Start Menu Folder" wizard page
WizardSelectProgramGroup=Izv�lieties Start Menu mapi
SelectStartMenuFolderDesc=Kur Uzst�d��anas programmai vajadz�tu likt �sin�jumikonas?
SelectStartMenuFolderLabel3=Uzst�d��ana izveidos �sin�jumikonas Start Menu map�.
SelectStartMenuFolderBrowseLabel=Lai turpin�tu, spiediet "T�l�k". Ja v�laties nor�d�t citu mapi, spiediet "P�rl�kot".
MustEnterGroupName=Jums ir j�nor�da mape.
GroupNameTooLong=Mapes nosaukums ir p�r�k gar�.
InvalidGroupName=Mape nav der�ga.
BadGroupName=Mapes nosaukums satur k�du no �iem simboliem:%n%n%1
NoProgramGroupCheck2=&Neizveidot Start Menu mapi

; *** "Ready to Install" wizard page
WizardReady=Gatavs instal�cijai
ReadyLabel1=Uzst�d��ana ir gatava instal�t [name] uz J�su datora.
ReadyLabel2a=Spiediet "Uzst�d�t", lai s�ktu instal�ciju, vai spiediet Atpaka�, lai izmain�tu parametrus.
ReadyLabel2b=Spiediet "Uzst�d�t", lai s�ktu instal�ciju.
ReadyMemoUserInfo=Lietot�ja inform�cija:
ReadyMemoDir=Galam�r�is:
ReadyMemoType=Uzst�d��anas tips:
ReadyMemoComponents=Izv�l�tie komponenti:
ReadyMemoGroup=Start Menu mape:
ReadyMemoTasks=Papilduzdevumi:

; *** "Preparing to Install" wizard page
WizardPreparing=Gatavoties instal�cijai
PreparingDesc=Uzst�d��ana ir gatava instal�t [name] uz J�su datora.
PreviousInstallNotCompleted=Instal�cija/no�em�ana iepriek��jai programmai nav pabeigta. Jums ir j�p�rstart� dators, lai pabeigtu instal�ciju.%n%nP�c p�rstart��anas palaidiet uzst�d��anu no jauna, lai pabeigtu uzst�d�t [name].
CannotContinue=Uzst�d��anu nevar turpin�t. L�dzu, spiediet "Atcelt", lai izietu.
ApplicationsFound=��das lietojumprogrammas izmanto failus, kas ir j�atjaunina ar Setup. Tas ir ieteicams, ka j�s �aujat Setup autom�tiski aizv�rt �os pieteikumus.
ApplicationsFound2=��das lietojumprogrammas izmanto failus, kas ir j�atjaunina ar Setup. Tas ir ieteicams, ka j�s �aujat Setup autom�tiski aizv�rt �os pieteikumus. P�c uzst�d��ana ir pabeigta, Setup m��in�s ats�kt pieteikumus.
CloseApplications=&Autom�tiski aizv�rtu programmas
DontCloseApplications=&Nav aizv�rtu programmas

; *** "Installing" wizard page
WizardInstalling=Instal�cija
InstallingLabel=L�dzu, uzgaidiet, kam�r [name] tiks uzst�d�ts uz J�su datora.

; *** "Setup Completed" wizard page
FinishedHeadingLabel=Pabeigta [name] Uzst�d��ana
FinishedLabelNoIcons=Uzst�d��ana pabeigta.
FinishedLabel=Uzst�d��ana pabeigta. Programmu var palaist, uzklik��inot uz izveidotaj�m ikon�m.
ClickFinish=Spiediet "Pabeigt", lai aizv�rtu Uzst�d��anu.
FinishedRestartLabel=Lai pabeigtu [name] uzst�d��anu, nepiecie�ams p�rstart�t J�su datoru. Vai v�laties to dar�t tagad?
FinishedRestartMessage=Lai pabeigtu [name] uzst�d��anu, nepiecie�ams p�rstart�t J�su datoru.%n%nVai v�laties to dar�t tagad?
ShowReadmeCheck=J�, v�los apskat�t README failu
YesRadio=&J�, p�rstart�t datoru tagad
NoRadio=&N�, datoru p�rstart��u v�l�k
; used for example as 'Run MyProg.exe'
RunEntryExec=Run %1
; used for example as 'View Readme.txt'
RunEntryShellExec=View %1

; *** "Setup Needs the Next Disk" stuff
ChangeDiskTitle=Uzst�d��anai ir nepiecie�ams n�kamais disks
SelectDiskLabel2=L�dzu, ielieciet %1 disku un spiediet "Ok".%n%nJa datne ir atrodama uz �� pa�a diska k�d� cit� map�, nor�diet t�s atra�an�s vietu vai spiediet "P�rl�kot", lai to nor�d�tu.
PathLabel=&Ce��:
FileNotInDir2=Datne "%1" neatrodas "%2". L�dzu, ielieciet pareizo disku vai nor�diet pareizo mapi.
SelectDirectoryLabel=L�dzu, nor�diet n�kam� diska atra�an�s vietu.

; *** Installation phase messages
SetupAborted=Uzst�d��ana netika pabeigta.%n%nL�dzu, izlabojiet k��du un palaidiet Uzst�d��anu no jauna.
EntryAbortRetryIgnore=Spiediet "Atk�rtot", lai m��in�tu v�lreiz, vai "Ignor�t", lai turpin�tu, vai "P�rtraukt", lai beigtu instal�ciju.

; *** Installation status messages
StatusClosingApplications=Nosl�guma pieteikumi...
StatusCreateDirs=Mapju izveido�ana...
StatusExtractFiles=Dat�u kop��ana...
StatusCreateIcons=�sin�jumikonu izveido�ana...
StatusCreateIniEntries=Izveido INI ierakstu...
StatusCreateRegistryEntries=Izveido re�istra ierakstus...
StatusRegisterFiles=Re�istr� datnes...
StatusSavingUninstall=Saglab� atinstal��anas datus...
StatusRunProgram=Pabeidz instal�ciju...
StatusRestartingApplications=Restart��ana pieteikumi...
StatusRollback=Izveido izmai�as...

; *** Misc. errors
ErrorInternal2=Iek��ja k��da: %1
ErrorFunctionFailedNoCode=%1 cieta neveiksmi
ErrorFunctionFailed=%1 cieta neveiksmi; kods %2
ErrorFunctionFailedWithMessage=%1 cieta neveiksmi; kods %2.%n%3
ErrorExecutingProgram=Neiesp�jami palaist failu:%n%1

; *** Registry errors
ErrorRegOpenKey=K��da, atverot re�istra atsl�gu:%n%1\%2
ErrorRegCreateKey=K��da, izveidojot re�istra atsl�gu:%n%1\%2
ErrorRegWriteKey=K��da, rakstot re�istra atsl�gu:%n%1\%2

; *** INI errors
ErrorIniEntry=K��da, izveidojot INI ieraksta datni "%1".

; *** File copying errors
FileAbortRetryIgnore=Spiediet "Atk�rtot", lai m��in�tu v�lreiz, "Ignor�t", lai izlaistu datni (nav ieteicams), vai "P�rtraukt", lai beigtu instal�ciju.
FileAbortRetryIgnore2=Spiediet "Atk�rtot", lai m��in�tu v�lreiz, "Ignor�t", lai turpin�tu (nav ieteicams), vai "P�rtraukt", lai beigtu instal�ciju.
SourceIsCorrupted=Datnes avots ir boj�ts
SourceDoesntExist=Datnes avots "%1" nepast�v
ExistingFileReadOnly=Past�vo�� datne ir izveidota k� read-only.%n%nSpiediet "Atk�rtot", lai no�emtu read-only �pa��bu un m��in�tu v�lreiz, "Ignor�t", lai izlaistu datni, vai "P�rtraukt", lai beigtu instal�ciju.
ErrorReadingExistingDest=K��da, nolasot past�vo�o datni:
FileExists=Datne jau past�v.%n%nVai v�laties, lai Uzst�d��ana to p�rraksta?
ExistingFileNewer=Past�vo�� datne ir jaun�ka par to, kuru nepiecie�ams uzst�d�t. V�lams atst�t jau past�vo�o datni.%n%nVai v�laties to patur�t?
ErrorChangingAttr=Radusies k��da, m��inot nomain�t datnes �pa��bu:
ErrorCreatingTemp=Radusies k��da, izveidojot datni galam�r�a map�:
ErrorReadingSource=Radusies k��da, nolasot datni:
ErrorCopying=Radusies k��da, p�rkop�jot datni:
ErrorReplacingExistingFile=Radusies k��da, p�rrakstot jau past�vo�o datni:
ErrorRestartReplace=Atk�rtota aizst��ana cietusi neveiksmi:
ErrorRenamingTemp=Radusies k��da, nomainot nosaukumu datnei galam�r�a map�:
ErrorRegisterServer=Neiesp�jami re�istr�t DLL/OCX: %1
ErrorRegSvr32Failed=RegSvr32 neizdev�s ar izejas kodu %1
ErrorRegisterTypeLib=Neiesp�jami re�istr�t tipa bibliot�ku: %1

; *** Post-installation errors
ErrorOpeningReadme=Radusies k��da, atverot README datni.
ErrorRestartingComputer=Uzst�d��ana nevar p�rstart�t datoru. L�dzu, izdariet to manu�li.

; *** Uninstaller messages
UninstallNotFound=Datne "%1" nepast�v. Nevar atinstal�t.
UninstallOpenError=Datni "%1" nevar atv�rt. Nevar atinstal�t
UninstallUnsupportedVer=Atinstal��anas datne "%1" nav atpaz�stama �ai atinstal��anas programmai. Nevar atinstal�t
UninstallUnknownEntry=Nezin�ms ieraksts (%1) izveidoja sadursmi ar atinstal�ciju
ConfirmUninstall=Vai esat p�rliecin�ts, ka v�laties piln�b� no�emt %1 un visus t� komponentus?
UninstallOnlyOnWin64=�o instal�ciju var no�emt tikai ar 64-bitu Windows.
OnlyAdminCanUninstall=Atinstal�ciju var veikt tikai lietot�js ar Adminstratora privil��ij�m.
UninstallStatusLabel=L�dzu uzgaidiet, kam�r %1 tiek no�emts no J�su datora.
UninstalledAll=%1 tika veiksm�gi no�emts no J�su datora.
UninstalledMost=%1 atinstal�cija pabeigta.%n%nDa�us elementus nevar�ja no�emt. Tos var no�emt manu�li.
UninstalledAndNeedsRestart=Lai pabeigtu atinstal�ciju %1, J�su dators j�p�rstart�.%n%nVai v�laties to dar�t tagad?
UninstallDataCorrupted="%1" datne ir boj�ta. Nevar atinstal�t

; *** Uninstallation phase messages
ConfirmDeleteSharedFileTitle=No�emt kop�g�s datnes?
ConfirmDeleteSharedFile2=Sist�ma ir secin�jusi, ka ��s koplieto�anas datnes vairs netiks lietotas. Vai v�laties t�s no�emt?%n%nJa k�da cita programma izmanto ��s datnes, tad �� programma var str�d�t nekorekti. Ja neesat dro�s, izv�lieties "N�". Atst�jot ��s datnes, J�su datoram netiks nodar�ti nek�di boj�jumi.
SharedFileNameLabel=Faila nosaukums:
SharedFileLocationLabel=Atra�an�s vieta:
WizardUninstalling=Atinstal��anas Statuss
StatusUninstalling=Atinstal� %1...

; *** Shutdown block reasons
ShutdownBlockReasonInstallingApp=Instal��ana %1.
ShutdownBlockReasonUninstallingApp=Atinstal� %1.

; The custom messages below aren't used by Setup itself, but if you make
; use of them in your scripts, you'll want to translate them.

[CustomMessages]

NameAndVersion=%1 versija %2
AdditionalIcons=Papildu ikonas:
CreateDesktopIcon=Izveidot &darbvisrmas ikonu
CreateQuickLaunchIcon=Izveidot &Quick Launch ikonu
ProgramOnTheWeb=%1 Intern�t�
UninstallProgram=Atinstal�t %1
LaunchProgram=Palaist %1
AssocFileExtension=&Apvienot %1 ar %2 faila papla�in�jumu
AssocingFileExtension=Apvieno�ana %1 ar %2 faila papla�in�jumu...
AutoStartProgramGroupDescription=starta:
AutoStartProgram=Autom�tiski s�kt %1
AddonHostProgramNotFound=%1 nevar atrasties map� j�s izv�l�j�ties.%n%nVai v�laties turpin�t?
STDFUDriverTaskDesc=Instalēt STM32 DFU draiveri (nepieciešams programmaparatūras zibatmiņai)