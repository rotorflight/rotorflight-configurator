;Inno Setup version 6.0.3+ Hungarian messages
;Based on the translation of Korn�l P�l, kornelpal@gmail.com
;Istv�n Szab�, E-mail: istvanszabo890629@gmail.com
;
; To download user-contributed translations of this file, go to:
;   http://www.jrsoftware.org/files/istrans/
;
; Note: When translating this text, do not add periods (.) to the end of
; messages that didn't have them already, because on those messages Inno
; Setup adds the periods automatically (appending a period would result in
; two periods being displayed).

[LangOptions]
; The following three entries are very important. Be sure to read and 
; understand the '[LangOptions] section' topic in the help file.
LanguageName=Magyar
LanguageID=$040E
LanguageCodePage=1250
; If the language you are translating to requires special font faces or
; sizes, uncomment any of the following entries and change them accordingly.
;DialogFontName=
;DialogFontSize=8
;WelcomeFontName=Verdana
;WelcomeFontSize=12
;TitleFontName=Arial CE
;TitleFontSize=29
;CopyrightFontName=Arial CE
;CopyrightFontSize=8

[Messages]

; *** Application titles
SetupAppTitle=Telep�t�
SetupWindowTitle=%1 - Telep�t�
UninstallAppTitle=Elt�vol�t�
UninstallAppFullTitle=%1 Elt�vol�t�

; *** Misc. common
InformationTitle=Inform�ci�k
ConfirmTitle=Meger�s�t
ErrorTitle=Hiba

; *** SetupLdr messages
SetupLdrStartupMessage=%1 telep�tve lesz. Szeretn� folytatni?
LdrCannotCreateTemp=�tmeneti f�jl l�trehoz�sa nem lehets�ges. A telep�t�s megszak�tva
LdrCannotExecTemp=F�jl futtat�sa nem lehets�ges az �tmeneti k�nyvt�rban. A telep�t�s megszak�tva
HelpTextNote=

; *** Startup error messages
LastErrorMessage=%1.%n%nHiba %2: %3
SetupFileMissing=A(z) %1 f�jl hi�nyzik a telep�t� k�nyvt�r�b�l. K�rem h�r�tsa el a probl�m�t, vagy szerezzen be egy m�sik p�ld�nyt a programb�l!
SetupFileCorrupt=A telep�t�si f�jlok s�r�ltek. K�rem, szerezzen be �j m�solatot a programb�l!
SetupFileCorruptOrWrongVer=A telep�t�si f�jlok s�r�ltek, vagy inkompatibilisek a telep�t� ezen verzi�j�val. H�r�tsa el a probl�m�t, vagy szerezzen be egy m�sik p�ld�nyt a programb�l!
InvalidParameter=A parancssorba �tadott param�ter �rv�nytelen:%n%n%1
SetupAlreadyRunning=A Telep�t� m�r fut.
WindowsVersionNotSupported=A program nem t�mogatja a Windows ezen verzi�j�t.
WindowsServicePackRequired=A program futtat�s�hoz %1 Service Pack %2 vagy �jabb sz�ks�ges.
NotOnThisPlatform=Ez a program nem futtathat� %1 alatt.
OnlyOnThisPlatform=Ezt a programot %1 alatt kell futtatni.
OnlyOnTheseArchitectures=A program kiz�r�lag a k�vetkez� processzor architekt�r�khoz tervezett Windows-on telep�thet�:%n%n%1
WinVersionTooLowError=A program futtat�s�hoz %1 %2 verzi�ja vagy k�s�bbi sz�ks�ges.
WinVersionTooHighError=Ez a program nem telep�thet� %1 %2 vagy k�s�bbire.
AdminPrivilegesRequired=Csak rendszergazdai m�dban telep�thet� ez a program.
PowerUserPrivilegesRequired=Csak rendszergazdak�nt vagy kiemelt felhaszn�l�k�nt telep�thet� ez a program.
SetupAppRunningError=A telep�t� �gy �szlelte %1 jelenleg fut.%n%nZ�rja be az �sszes p�ld�nyt, majd kattintson az 'OK'-ra a folytat�shoz, vagy a 'M�gse'-re a kil�p�shez.
UninstallAppRunningError=Az elt�vol�t� �gy �szlelte %1 jelenleg fut.%n%nZ�rja be az �sszes p�ld�nyt, majd kattintson az 'OK'-ra a folytat�shoz, vagy a 'M�gse'-re a kil�p�shez.

; *** Startup questions
PrivilegesRequiredOverrideTitle=Telep�t�si m�d kiv�laszt�sa
PrivilegesRequiredOverrideInstruction=V�lasszon telep�t�si m�dot
PrivilegesRequiredOverrideText1=%1 telep�thet� az �sszes felhaszn�l�nak (rendszergazdai jogok sz�ks�gesek), vagy csak mag�nak.
PrivilegesRequiredOverrideText2=%1 csak mag�nak telep�thet�, vagy az �sszes felhaszn�l�nak (rendszergazdai jogok sz�ks�gesek).
PrivilegesRequiredOverrideAllUsers=Telep�t�s &mindenkinek
PrivilegesRequiredOverrideAllUsersRecommended=Telep�t�s &mindenkinek (aj�nlott)
PrivilegesRequiredOverrideCurrentUser=Telep�t�s csak &nekem
PrivilegesRequiredOverrideCurrentUserRecommended=Telep�t�s csak &nekem (aj�nlott)

; *** Misc. errors
ErrorCreatingDir=A Telep�t� nem tudta l�trehozni a(z) "%1" k�nyvt�rat
ErrorTooManyFilesInDir=Nem hozhat� l�tre f�jl a(z) "%1" k�nyvt�rban, mert az m�r t�l sok f�jlt tartalmaz

; *** Setup common messages
ExitSetupTitle=Kil�p�s a telep�t�b�l
ExitSetupMessage=A telep�t�s m�g folyamatban van. Ha most kil�p, a program nem ker�l telep�t�sre.%n%nM�sik alkalommal is futtathat� a telep�t�s befejez�s�hez%n%nKil�p a telep�t�b�l?
AboutSetupMenuItem=&N�vjegy...
AboutSetupTitle=Telep�t� n�vjegye
AboutSetupMessage=%1 %2 verzi�%n%3%n%nAz %1 honlapja:%n%4
AboutSetupNote=
TranslatorNote=

; *** Buttons
ButtonBack=< &Vissza
ButtonNext=&Tov�bb >
ButtonInstall=&Telep�t
ButtonOK=OK
ButtonCancel=M�gse
ButtonYes=&Igen
ButtonYesToAll=&Mindet
ButtonNo=&Nem
ButtonNoToAll=&Egyiket se
ButtonFinish=&Befejez�s
ButtonBrowse=&Tall�z�s...
ButtonWizardBrowse=T&all�z�s...
ButtonNewFolder=�j &k�nyvt�r

; *** "Select Language" dialog messages
SelectLanguageTitle=Telep�t� nyelvi be�ll�t�s
SelectLanguageLabel=V�lassza ki a telep�t�s alatt haszn�lt nyelvet.

; *** Common wizard text
ClickNext=A folytat�shoz kattintson a 'Tov�bb'-ra, a kil�p�shez a 'M�gse'-re.
BeveledLabel=
BrowseDialogTitle=V�lasszon k�nyvt�rt 
BrowseDialogLabel=V�lasszon egy k�nyvt�rat az al�bbi list�b�l, majd kattintson az 'OK'-ra.
NewFolderName=�j k�nyvt�r

; *** "Welcome" wizard page
WelcomeLabel1=�dv�zli a(z) [name] Telep�t�var�zsl�ja.
WelcomeLabel2=A(z) [name/ver] telep�t�sre ker�l a sz�m�t�g�p�n.%n%nAj�nlott minden, egy�b fut� alkalmaz�s bez�r�sa a folytat�s el�tt.

; *** "Password" wizard page
WizardPassword=Jelsz�
PasswordLabel1=Ez a telep�t�s jelsz�val v�dett.
PasswordLabel3=K�rem adja meg a jelsz�t, majd kattintson a 'Tov�bb'-ra. A jelszavak kis- �s nagy bet� �rz�kenyek lehetnek.
PasswordEditLabel=&Jelsz�:
IncorrectPassword=Az �n �ltal megadott jelsz� helytelen. Pr�b�lja �jra.

; *** "License Agreement" wizard page
WizardLicense=Licencszerz�d�s
LicenseLabel=Olvassa el figyelmesen az inform�ci�kat folytat�s el�tt.
LicenseLabel3=K�rem, olvassa el az al�bbi licencszerz�d�st. A telep�t�s folytat�s�hoz, el kell fogadnia a szerz�d�st.
LicenseAccepted=&Elfogadom a szerz�d�st
LicenseNotAccepted=&Nem fogadom el a szerz�d�st

; *** "Information" wizard pages
WizardInfoBefore=Inform�ci�k
InfoBeforeLabel=Olvassa el a k�vetkez� fontos inform�ci�kat a folytat�s el�tt.
InfoBeforeClickLabel=Ha k�szen �ll, kattintson a 'Tov�bb'-ra.
WizardInfoAfter=Inform�ci�k
InfoAfterLabel=Olvassa el a k�vetkez� fontos inform�ci�kat a folytat�s el�tt.
InfoAfterClickLabel=Ha k�szen �ll, kattintson a 'Tov�bb'-ra.

; *** "User Information" wizard page
WizardUserInfo=Felhaszn�l� adatai
UserInfoDesc=K�rem, adja meg az adatait
UserInfoName=&Felhaszn�l�n�v:
UserInfoOrg=&Szervezet:
UserInfoSerial=&Sorozatsz�m:
UserInfoNameRequired=Meg kell adnia egy nevet.

; *** "Select Destination Location" wizard page
WizardSelectDir=V�lasszon c�lk�nyvt�rat
SelectDirDesc=Hova telep�lj�n a(z) [name]?
SelectDirLabel3=A(z) [name] az al�bbi k�nyvt�rba lesz telep�tve. 
SelectDirBrowseLabel=A folytat�shoz, kattintson a 'Tov�bb'-ra. Ha m�sik k�nyvt�rat v�lasztana, kattintson a 'Tall�z�s'-ra.
DiskSpaceGBLabel=At least [gb] GB szabad ter�letre van sz�ks�g.
DiskSpaceMBLabel=Legal�bb [mb] MB szabad ter�letre van sz�ks�g.
CannotInstallToNetworkDrive=A Telep�t� nem tud h�l�zati meghajt�ra telep�teni.
CannotInstallToUNCPath=A Telep�t� nem tud h�l�zati UNC el�r�si �tra telep�teni.
InvalidPath=Teljes �tvonalat adjon meg, a meghajt� bet�jel�vel; p�ld�ul:%n%nC:\Alkalmaz�s%n%nvagy egy h�l�zati �tvonalat a k�vetkez� alakban:%n%n\\kiszolg�l�\megoszt�s
InvalidDrive=A kiv�lasztott meghajt� vagy h�l�zati megoszt�s nem l�tezik vagy nem el�rhet�. V�lasszon egy m�sikat.
DiskSpaceWarningTitle=Nincs el�g szabad ter�let
DiskSpaceWarning=A Telep�t�nek legal�bb %1 KB szabad lemezter�letre van sz�ks�ge, viszont a kiv�lasztott meghajt�n csup�n %2 KB �ll rendelkez�sre.%n%nMindenk�ppen folytatja?
DirNameTooLong=A k�nyvt�r neve vagy az �tvonal t�l hossz�.
InvalidDirName=A k�nyvt�r neve �rv�nytelen.
BadDirName32=A k�nyvt�rak nevei ezen karakterek egyik�t sem tartalmazhatj�k:%n%n%1
DirExistsTitle=A k�nyvt�r m�r l�tezik
DirExists=A k�nyvt�r:%n%n%1%n%nm�r l�tezik. Mindenk�pp ide akar telep�teni?
DirDoesntExistTitle=A k�nyvt�r nem l�tezik
DirDoesntExist=A k�nyvt�r:%n%n%1%n%nnem l�tezik. Szeretn� l�trehozni?

; *** "Select Components" wizard page
WizardSelectComponents=�sszetev�k kiv�laszt�sa
SelectComponentsDesc=Mely �sszetev�k ker�ljenek telep�t�sre?
SelectComponentsLabel2=Jel�lje ki a telep�tend� �sszetev�ket; t�r�lje a telep�teni nem k�v�nt �sszetev�ket. Kattintson a 'Tov�bb'-ra, ha k�szen �ll a folytat�sra.
FullInstallation=Teljes telep�t�s
; if possible don't translate 'Compact' as 'Minimal' (I mean 'Minimal' in your language)
CompactInstallation=Szok�sos telep�t�s
CustomInstallation=Egy�ni telep�t�s
NoUninstallWarningTitle=L�tez� �sszetev�
NoUninstallWarning=A telep�t� �gy tal�lta, hogy a k�vetkez� �sszetev�k m�r telep�tve vannak a sz�m�t�g�pre:%n%n%1%n%nEzen �sszetev�k kijel�l�s�nek t�rl�se, nem t�vol�tja el azokat a sz�m�t�g�pr�l.%n%nMindenk�ppen folytatja?
ComponentSize1=%1 KB
ComponentSize2=%1 MB
ComponentsDiskSpaceMBLabel=A jelenlegi kijel�l�s legal�bb [gb] GB lemezter�letet ig�nyel.
ComponentsDiskSpaceMBLabel=A jelenlegi kijel�l�s legal�bb [mb] MB lemezter�letet ig�nyel.

; *** "Select Additional Tasks" wizard page
WizardSelectTasks=Tov�bbi feladatok
SelectTasksDesc=Mely kieg�sz�t� feladatok ker�ljenek v�grehajt�sra?
SelectTasksLabel2=Jel�lje ki, mely kieg�sz�t� feladatokat hajtsa v�gre a Telep�t� a(z) [name] telep�t�se sor�n, majd kattintson a 'Tov�bb'-ra.

; *** "Select Start Menu Folder" wizard page
WizardSelectProgramGroup=Start Men� k�nyvt�ra
SelectStartMenuFolderDesc=Hova helyezze a Telep�t� a program parancsikonjait?
SelectStartMenuFolderLabel3=A Telep�t� a program parancsikonjait a Start men� k�vetkez� mapp�j�ban fogja l�trehozni.
SelectStartMenuFolderBrowseLabel=A folytat�shoz kattintson a 'Tov�bb'-ra. Ha m�sik mapp�t v�lasztana, kattintson a 'Tall�z�s'-ra.
MustEnterGroupName=Meg kell adnia egy mappanevet.
GroupNameTooLong=A k�nyvt�r neve vagy az �tvonal t�l hossz�.
InvalidGroupName=A k�nyvt�r neve �rv�nytelen.
BadGroupName=A k�nyvt�rak nevei ezen karakterek egyik�t sem tartalmazhatj�k:%n%n%1
NoProgramGroupCheck2=&Ne hozzon l�tre mapp�t a Start men�ben

; *** "Ready to Install" wizard page
WizardReady=K�szen �llunk a telep�t�sre
ReadyLabel1=A Telep�t� k�szen �ll, a(z) [name] sz�m�t�g�pre telep�t�shez.
ReadyLabel2a=Kattintson a 'Telep�t�s'-re a folytat�shoz, vagy a "Vissza"-ra a be�ll�t�sok �ttekint�s�hez vagy megv�ltoztat�s�hoz.
ReadyLabel2b=Kattintson a 'Telep�t�s'-re a folytat�shoz.
ReadyMemoUserInfo=Felhaszn�l� adatai:
ReadyMemoDir=Telep�t�s c�lk�nyvt�ra:
ReadyMemoType=Telep�t�s t�pusa:
ReadyMemoComponents=V�lasztott �sszetev�k:
ReadyMemoGroup=Start men� mapp�ja:
ReadyMemoTasks=Kieg�sz�t� feladatok:

; *** "Preparing to Install" wizard page
WizardPreparing=Felk�sz�l�s a telep�t�sre
PreparingDesc=A Telep�t� felk�sz�l a(z) [name] sz�m�t�g�pre t�rt�n� telep�t�shez.
PreviousInstallNotCompleted=gy kor�bbi program telep�t�se/elt�vol�t�sa nem fejez�d�tt be. �jra kell ind�tania a sz�m�t�g�p�t a m�sik telep�t�s befejez�s�hez.%n%nA sz�m�t�g�pe �jraind�t�sa ut�n ism�t futtassa a Telep�t�t a(z) [name] telep�t�s�nek befejez�s�hez.
CannotContinue=A telep�t�s nem folytathat�. A kil�p�shez kattintson a 'M�gse'-re
ApplicationsFound=A k�vetkez� alkalmaz�sok olyan f�jlokat haszn�lnak, amelyeket a Telep�t�nek friss�teni kell. Aj�nlott, hogy enged�lyezze a Telep�t�nek ezen alkalmaz�sok automatikus bez�r�s�t.
ApplicationsFound2=A k�vetkez� alkalmaz�sok olyan f�jlokat haszn�lnak, amelyeket a Telep�t�nek friss�teni kell. Aj�nlott, hogy enged�lyezze a Telep�t�nek ezen alkalmaz�sok automatikus bez�r�s�t. A telep�t�s befejez�se ut�n a Telep�t� megk�s�rli az alkalmaz�sok �jraind�t�s�t.
CloseApplications=&Alkalmaz�sok automatikus bez�r�sa
DontCloseApplications=&Ne z�rja be az alkalmaz�sokat
ErrorCloseApplications=A Telep�t� nem tudott minden alkalmaz�st automatikusan bez�rni. A folytat�s el�tt aj�nlott minden, a Telep�t� �ltal friss�tend� f�jlokat haszn�l� alkalmaz�st bez�rni.
PrepareToInstallNeedsRestart=A telep�t�nek �jra kell ind�tania a sz�m�t�g�pet. �jraind�t�st k�vet�en, futtassa �jb�l a telep�t�t, a [name] telep�t�s�nek befejez�s�hez .%n%n�jra szeretn� ind�tani most a sz�m�t�g�pet?

; *** "Installing" wizard page
WizardInstalling=Telep�t�s
InstallingLabel=K�rem v�rjon, am�g a(z) [name] telep�t�se zajlik.

; *** "Setup Completed" wizard page
FinishedHeadingLabel=A(z) [name] telep�t�s�nek befejez�se
FinishedLabelNoIcons=A Telep�t� v�gzett a(z) [name] telep�t�s�vel.
FinishedLabel=A Telep�t� v�gzett a(z) [name] telep�t�s�vel. Az alkalmaz�st a l�trehozott ikonok kiv�laszt�s�val ind�thatja.
ClickFinish=Kattintson a 'Befejez�s'-re a kil�p�shez.
FinishedRestartLabel=A(z) [name] telep�t�s�nek befejez�s�hez �jra kell ind�tani a sz�m�t�g�pet. �jraind�tja most?
FinishedRestartMessage=A(z) [name] telep�t�s�nek befejez�s�hez, a Telep�t�nek �jra kell ind�tani a sz�m�t�g�pet.%n%n�jraind�tja most?
ShowReadmeCheck=Igen, szeretn�m elolvasni a FONTOS f�jlt
YesRadio=&Igen, �jraind�t�s most
NoRadio=&Nem, k�s�bb ind�tom �jra
; used for example as 'Run MyProg.exe'
RunEntryExec=%1 futtat�sa
; used for example as 'View Readme.txt'
RunEntryShellExec=%1 megtekint�se

; *** "Setup Needs the Next Disk" stuff
ChangeDiskTitle=A Telep�t�nek sz�ks�ge van a k�vetkez� lemezre
SelectDiskLabel2=Helyezze be a(z) %1. lemezt �s kattintson az 'OK'-ra.%n%nHa a f�jlok a lemez egy a megjelen�tett�l k�l�nb�z� mapp�j�ban tal�lhat�k, �rja be a helyes �tvonalat vagy kattintson a 'Tall�z�s'-ra.
PathLabel=�&tvonal:
FileNotInDir2=A(z) "%1" f�jl nem tal�lhat� a k�vetkez� helyen: "%2". Helyezze be a megfelel� lemezt vagy v�lasszon egy m�sik mapp�t.
SelectDirectoryLabel=Adja meg a k�vetkez� lemez hely�t.

; *** Installation phase messages
SetupAborted=A telep�t�s nem fejez�d�tt be.%n%nH�r�tsa el a hib�t �s futtassa �jb�l a Telep�t�t.
AbortRetryIgnoreSelectAction=V�lasszon m�veletet
AbortRetryIgnoreRetry=&�jra
AbortRetryIgnoreIgnore=&Hiba elvet�se �s folytat�s
AbortRetryIgnoreCancel=Telep�t�s megszak�t�sa

; *** Installation status messages
StatusClosingApplications=Alkalmaz�sok bez�r�sa...
StatusCreateDirs=K�nyvt�rak l�trehoz�sa...
StatusExtractFiles=F�jlok kibont�sa...
StatusCreateIcons=Parancsikonok l�trehoz�sa...
StatusCreateIniEntries=INI bejegyz�sek l�trehoz�sa...
StatusCreateRegistryEntries=Rendszerle�r� bejegyz�sek l�trehoz�sa...
StatusRegisterFiles=F�jlok regisztr�l�sa...
StatusSavingUninstall=Elt�vol�t� inform�ci�k ment�se...
StatusRunProgram=Telep�t�s befejez�se...
StatusRestartingApplications=Alkalmaz�sok �jraind�t�sa...
StatusRollback=V�ltoztat�sok visszavon�sa...

; *** Misc. errors
ErrorInternal2=Bels� hiba: %1
ErrorFunctionFailedNoCode=Sikertelen %1
ErrorFunctionFailed=Sikertelen %1; k�d: %2
ErrorFunctionFailedWithMessage=Sikertelen %1; k�d: %2.%n%3
ErrorExecutingProgram=Nem hajthat� v�gre a f�jl:%n%1

; *** Registry errors
ErrorRegOpenKey=Nem nyithat� meg a rendszerle�r� kulcs:%n%1\%2
ErrorRegCreateKey=Nem hozhat� l�tre a rendszerle�r� kulcs:%n%1\%2
ErrorRegWriteKey=Nem m�dos�that� a rendszerle�r� kulcs:%n%1\%2

; *** INI errors
ErrorIniEntry=Bejegyz�s l�trehoz�sa sikertelen a k�vetkez� INI f�jlban: "%1".

; *** File copying errors
FileAbortRetryIgnoreSkipNotRecommended=&F�jl kihagy�sa (nem aj�nlott)
FileAbortRetryIgnoreIgnoreNotRecommended=&Hiba elvet�se �s folytat�s (nem aj�nlott)
SourceIsCorrupted=A forr�sf�jl megs�r�lt
SourceDoesntExist=A(z) "%1" forr�sf�jl nem l�tezik
ExistingFileReadOnly2=A f�jl csak olvashat�k�nt van jel�lve.
ExistingFileReadOnlyRetry=Csak &olvashat� tulajdons�g elt�vol�t�sa �s �jra pr�b�lkoz�s 
ExistingFileReadOnlyKeepExisting=&L�tez� f�jl megtart�sa
ErrorReadingExistingDest=Hiba l�pett fel a f�jl olvas�sa k�zben:
FileExists=A f�jl m�r l�tezik.%n%nFel�l k�v�nja �rni?
ExistingFileNewer=A l�tez� f�jl �jabb a telep�t�sre ker�l�n�l. Aj�nlott a l�tez� f�jl megtart�sa.%n%nMeg k�v�nja tartani a l�tez� f�jlt?
ErrorChangingAttr=Hiba l�pett fel a f�jl attrib�tum�nak m�dos�t�sa k�zben:
ErrorCreatingTemp=Hiba l�pett fel a f�jl telep�t�si k�nyvt�rban t�rt�n� l�trehoz�sa k�zben:
ErrorReadingSource=Hiba l�pett fel a forr�sf�jl olvas�sa k�zben:
ErrorCopying=Hiba l�pett fel a f�jl m�sol�sa k�zben:
ErrorReplacingExistingFile=Hiba l�pett fel a l�tez� f�jl cser�je k�zben:
ErrorRestartReplace=A f�jl cser�je az �jraind�t�s ut�n sikertelen volt:
ErrorRenamingTemp=Hiba l�pett fel f�jl telep�t�si k�nyvt�rban t�rt�n� �tnevez�se k�zben:
ErrorRegisterServer=Nem lehet regisztr�lni a DLL-t/OCX-et: %1
ErrorRegSvr32Failed=Sikertelen RegSvr32. A visszaadott k�d: %1
ErrorRegisterTypeLib=Nem lehet regisztr�lni a t�pust�rat: %1

; *** Uninstall display name markings
; used for example as 'My Program (32-bit)'
UninstallDisplayNameMark=%1 (%2)
; used for example as 'My Program (32-bit, All users)'
UninstallDisplayNameMarks=%1 (%2, %3)
UninstallDisplayNameMark32Bit=32-bit
UninstallDisplayNameMark64Bit=64-bit
UninstallDisplayNameMarkAllUsers=Minden felhaszn�l�
UninstallDisplayNameMarkCurrentUser=Jelenlegi felhaszn�l�

; *** Post-installation errors
ErrorOpeningReadme=Hiba l�pett fel a FONTOS f�jl megnyit�sa k�zben.
ErrorRestartingComputer=A Telep�t� nem tudta �jraind�tani a sz�m�t�g�pet. Ind�tsa �jra k�zileg.

; *** Uninstaller messages
UninstallNotFound=A(z) "%1" f�jl nem l�tezik. Nem t�vol�that� el.
UninstallOpenError=A(z) "%1" f�jl nem nyithat� meg. Nem t�vol�that� el.
UninstallUnsupportedVer=A(z) "%1" elt�vol�t�si napl�f�jl form�tum�t nem tudja felismerni az elt�vol�t� jelen verzi�ja. Az elt�vol�t�s nem folytathat�
UninstallUnknownEntry=Egy ismeretlen bejegyz�s (%1) tal�lhat� az elt�vol�t�si napl�f�jlban
ConfirmUninstall=Biztosan el k�v�nja t�vol�tani a(z) %1 programot �s minden �sszetev�j�t?
UninstallOnlyOnWin64=Ezt a telep�t�st csak 64-bites Windowson lehet elt�vol�tani.
OnlyAdminCanUninstall=Ezt a telep�t�st csak adminisztr�ci�s jogokkal rendelkez� felhaszn�l� t�vol�thatja el.
UninstallStatusLabel=Legyen t�relemmel, am�g a(z) %1 sz�m�t�g�p�r�l t�rt�n� elt�vol�t�sa befejez�dik.
UninstalledAll=A(z) %1 sikeresen el lett t�vol�tva a sz�m�t�g�pr�l.
UninstalledMost=A(z) %1 elt�vol�t�sa befejez�d�tt.%n%nN�h�ny elemet nem lehetett elt�vol�tani. T�r�lje k�zileg.
UninstalledAndNeedsRestart=A(z) %1 elt�vol�t�s�nak befejez�s�hez �jra kell ind�tania a sz�m�t�g�p�t.%n%n�jraind�tja most?
UninstallDataCorrupted=A(z) "%1" f�jl s�r�lt. Nem t�vol�that� el.

; *** Uninstallation phase messages
ConfirmDeleteSharedFileTitle=T�rli a megosztott f�jlt?
ConfirmDeleteSharedFile2=A rendszer azt jelzi, hogy a k�vetkez� megosztott f�jlra m�r nincs sz�ks�ge egyetlen programnak sem. Elt�vol�tja a megosztott f�jlt?%n%nHa m�s programok m�g mindig haszn�lj�k a megosztott f�jlt, akkor az elt�vol�t�sa ut�n lehet, hogy nem fognak megfelel�en m�k�dni. Ha bizonytalan, v�lassza a Nemet. A f�jl megtart�sa nem okoz probl�m�t a rendszerben.
SharedFileNameLabel=F�jln�v:
SharedFileLocationLabel=Helye:
WizardUninstalling=Elt�vol�t�s �llapota
StatusUninstalling=%1 elt�vol�t�sa...

; *** Shutdown block reasons
ShutdownBlockReasonInstallingApp=%1 telep�t�se.
ShutdownBlockReasonUninstallingApp=%1 elt�vol�t�sa.

; The custom messages below aren't used by Setup itself, but if you make
; use of them in your scripts, you'll want to translate them.

[CustomMessages]

NameAndVersion=%1, verzi�: %2
AdditionalIcons=Tov�bbi parancsikonok:
CreateDesktopIcon=&Asztali ikon l�trehoz�sa
CreateQuickLaunchIcon=&Gyorsind�t� parancsikon l�trehoz�sa
ProgramOnTheWeb=%1 az interneten
UninstallProgram=Elt�vol�t�s - %1
LaunchProgram=Ind�t�s %1
AssocFileExtension=A(z) %1 &t�rs�t�sa a(z) %2 f�jlkiterjeszt�ssel
AssocingFileExtension=A(z) %1 t�rs�t�sa a(z) %2 f�jlkiterjeszt�ssel...
AutoStartProgramGroupDescription=Ind�t�pult:
AutoStartProgram=%1 automatikus ind�t�sa
AddonHostProgramNotFound=A(z) %1 nem tal�lhat� a kiv�lasztott k�nyvt�rban.%n%nMindenk�ppen folytatja?
STDFUDriverTaskDesc=STM32 DFU illesztőprogram telepítése (szükséges a firmware villogtatásához)