; *** Inno Setup version 6.0.3+ Polish messages ***
; Krzysztof Cynarski <krzysztof at cynarski.net>
; Proofreading, corrections and 6.0.0+ updates:
; �ukasz Abramczuk <lukasz.abramczuk at gmail.com>
; To download user-contributed translations of this file, go to:
; http://www.jrsoftware.org/is3rdparty.php
;
; Note: When translating this text, do not add periods (.) to the end of
; messages that didn't have them already, because on those messages Inno
; Setup adds the periods automatically (appending a period would result in
; two periods being displayed).
; last update: 2019/10/03 

[LangOptions]
; The following three entries are very important. Be sure to read and 
; understand the '[LangOptions] section' topic in the help file.
LanguageName=Polski
LanguageID=$0415
LanguageCodePage=1250
 

[Messages]
  
; *** Application titles
SetupAppTitle=Instalator
SetupWindowTitle=Instalacja - %1
UninstallAppTitle=Dezinstalator
UninstallAppFullTitle=Dezinstalacja - %1

; *** Misc. common
InformationTitle=Informacja
ConfirmTitle=Potwierd�
ErrorTitle=B��d

; *** SetupLdr messages
SetupLdrStartupMessage=Ten program zainstaluje aplikacj� %1. Czy chcesz kontynuowa�?
LdrCannotCreateTemp=Nie mo�na utworzy� pliku tymczasowego. Instalacja przerwana
LdrCannotExecTemp=Nie mo�na uruchomi� pliku z folderu tymczasowego. Instalacja przerwana
HelpTextNote=

; *** Startup error messages
LastErrorMessage=%1.%n%nB��d %2: %3
SetupFileMissing=W folderze instalacyjnym brakuje pliku %1.%nProsz� o przywr�cenie brakuj�cych plik�w lub uzyskanie nowej kopii programu instalacyjnego.
SetupFileCorrupt=Pliki instalacyjne s� uszkodzone. Zaleca si� uzyskanie nowej kopii programu instalacyjnego.
SetupFileCorruptOrWrongVer=Pliki instalacyjne s� uszkodzone lub niezgodne z t� wersj� instalatora. Prosz� rozwi�za� problem lub uzyska� now� kopi� programu instalacyjnego.
InvalidParameter=W linii komend przekazano nieprawid�owy parametr:%n%n%1
SetupAlreadyRunning=Instalator jest ju� uruchomiony.
WindowsVersionNotSupported=Ta aplikacja nie wspiera aktualnie uruchomionej wersji Windows.
WindowsServicePackRequired=Ta aplikacja wymaga systemu %1 z dodatkiem Service Pack %2 lub nowszym.
NotOnThisPlatform=Tej aplikacji nie mo�na uruchomi� w systemie %1.
OnlyOnThisPlatform=Ta aplikacja wymaga systemu %1.
OnlyOnTheseArchitectures=Ta aplikacja mo�e by� uruchomiona tylko w systemie Windows zaprojektowanym dla procesor�w o architekturze:%n%n%1
WinVersionTooLowError=Ta aplikacja wymaga systemu %1 w wersji %2 lub nowszej.
WinVersionTooHighError=Ta aplikacja nie mo�e by� zainstalowana w systemie %1 w wersji %2 lub nowszej.
AdminPrivilegesRequired=Aby przeprowadzi� instalacj� tej aplikacji, konto u�ytkownika systemu musi posiada� uprawnienia administratora.
PowerUserPrivilegesRequired=Aby przeprowadzi� instalacj� tej aplikacji, konto u�ytkownika systemu musi posiada� uprawnienia administratora lub u�ytkownika zaawansowanego.
SetupAppRunningError=Instalator wykry�, i� aplikacja %1 jest aktualnie uruchomiona.%n%nPrzed wci�ni�ciem przycisku OK zamknij wszystkie procesy aplikacji. Kliknij przycisk Anuluj, aby przerwa� instalacj�.
UninstallAppRunningError=Dezinstalator wykry�, i� aplikacja %1 jest aktualnie uruchomiona.%n%nPrzed wci�ni�ciem przycisku OK zamknij wszystkie procesy aplikacji. Kliknij przycisk Anuluj, aby przerwa� dezinstalacj�.

; *** Startup questions	 ---
PrivilegesRequiredOverrideTitle=Wybierz typ instalacji aplikacji
PrivilegesRequiredOverrideInstruction=Wybierz typ instalacji
PrivilegesRequiredOverrideText1=Aplikacja %1 mo�e zosta� zainstalowana dla wszystkich u�ytkownik�w (wymagane s� uprawnienia administratora) lub tylko dla bie��cego u�ytkownika.
PrivilegesRequiredOverrideText2=Aplikacja %1 mo�e zosta� zainstalowana dla bie��cego u�ytkownika lub wszystkich u�ytkownik�w (wymagane s� uprawnienia administratora).
PrivilegesRequiredOverrideAllUsers=Zainstaluj dla &wszystkich u�ytkownik�w
PrivilegesRequiredOverrideAllUsersRecommended=Zainstaluj dla &wszystkich u�ytkownik�w (zalecane)
PrivilegesRequiredOverrideCurrentUser=Zainstaluj dla &bie��cego u�ytkownika
PrivilegesRequiredOverrideCurrentUserRecommended=Zainstaluj dla &bie��cego u�ytkownika (zalecane)

; *** Misc. errors
ErrorCreatingDir=Instalator nie m�g� utworzy� katalogu "%1"
ErrorTooManyFilesInDir=Nie mo�na utworzy� pliku w katalogu %1, poniewa� zawiera on zbyt wiele plik�w

; *** Setup common messages
ExitSetupTitle=Zako�cz instalacj�
ExitSetupMessage=Instalacja nie zosta�a zako�czona. Je�eli przerwiesz j� teraz, aplikacja nie zostanie zainstalowana. Mo�na ponowi� instalacj� p�niej poprzez uruchamianie instalatora.%n%nCzy chcesz przerwa� instalacj�?
AboutSetupMenuItem=&O instalatorze...
AboutSetupTitle=O instalatorze
AboutSetupMessage=%1 wersja %2%n%3%n%n Strona domowa %1:%n%4
AboutSetupNote=
TranslatorNote=Wersja polska: Krzysztof Cynarski%n<krzysztof at cynarski.net>%nKorekta: �ukasz Abramczuk%n<lukasz.abramczuk at gmail.com>

; *** Buttons
ButtonBack=< &Wstecz
ButtonNext=&Dalej >
ButtonInstall=&Instaluj
ButtonOK=OK
ButtonCancel=Anuluj
ButtonYes=&Tak
ButtonYesToAll=Tak na &wszystkie
ButtonNo=&Nie
ButtonNoToAll=N&ie na wszystkie
ButtonFinish=&Zako�cz
ButtonBrowse=&Przegl�daj...
ButtonWizardBrowse=P&rzegl�daj...
ButtonNewFolder=&Utw�rz nowy folder
 
; *** "Select Language" dialog messages
SelectLanguageTitle=J�zyk instalacji
SelectLanguageLabel=Wybierz j�zyk u�ywany podczas instalacji:

; *** Common wizard text
ClickNext=Kliknij przycisk Dalej, aby kontynuowa�, lub Anuluj, aby zako�czy� instalacj�.
BeveledLabel=
BrowseDialogTitle=Wska� folder
BrowseDialogLabel=Wybierz folder z poni�szej listy, a nast�pnie kliknij przycisk OK.
NewFolderName=Nowy folder

; *** "Welcome" wizard page
WelcomeLabel1=Witamy w instalatorze aplikacji [name]
WelcomeLabel2=Aplikacja [name/ver] zostanie teraz zainstalowana na komputerze.%n%nZalecane jest zamkni�cie wszystkich innych uruchomionych program�w przed rozpocz�ciem procesu instalacji.

; *** "Password" wizard page
WizardPassword=Has�o
PasswordLabel1=Ta instalacja jest zabezpieczona has�em.
PasswordLabel3=Podaj has�o, a nast�pnie kliknij przycisk Dalej, aby kontynuowa�. W has�ach rozr�niane s� wielkie i ma�e litery.
PasswordEditLabel=&Has�o:
IncorrectPassword=Wprowadzone has�o jest nieprawid�owe. Spr�buj ponownie.

; *** "License Agreement" wizard page
WizardLicense=Umowa Licencyjna
LicenseLabel=Przed kontynuacj� nale�y zapozna� si� z poni�sz� wa�n� informacj�.
LicenseLabel3=Prosz� przeczyta� tekst Umowy Licencyjnej. Przed kontynuacj� instalacji nale�y zaakceptowa� warunki umowy.
LicenseAccepted=&Akceptuj� warunki umowy
LicenseNotAccepted=&Nie akceptuj� warunk�w umowy

; *** "Information" wizard pages
WizardInfoBefore=Informacja
InfoBeforeLabel=Przed kontynuacj� nale�y zapozna� si� z poni�sz� informacj�.
InfoBeforeClickLabel=Kiedy b�dziesz gotowy do instalacji, kliknij przycisk Dalej.
WizardInfoAfter=Informacja
InfoAfterLabel=Przed kontynuacj� nale�y zapozna� si� z poni�sz� informacj�.
InfoAfterClickLabel=Gdy b�dziesz gotowy do zako�czenia instalacji, kliknij przycisk Dalej.

; *** "User Information" wizard page
WizardUserInfo=Dane u�ytkownika
UserInfoDesc=Prosz� poda� swoje dane.
UserInfoName=Nazwa &u�ytkownika:
UserInfoOrg=&Organizacja:
UserInfoSerial=Numer &seryjny:
UserInfoNameRequired=Nazwa u�ytkownika jest wymagana.

; *** "Select Destination Location" wizard page
WizardSelectDir=Lokalizacja docelowa
SelectDirDesc=Gdzie ma zosta� zainstalowana aplikacja [name]?
SelectDirLabel3=Instalator zainstaluje aplikacj� [name] do wskazanego poni�ej folderu.
SelectDirBrowseLabel=Kliknij przycisk Dalej, aby kontynuowa�. Je�li chcesz wskaza� inny folder, kliknij przycisk Przegl�daj.
DiskSpaceGBLabel=Instalacja wymaga przynajmniej [gb] GB wolnego miejsca na dysku.
DiskSpaceMBLabel=Instalacja wymaga przynajmniej [mb] MB wolnego miejsca na dysku.
CannotInstallToNetworkDrive=Instalator nie mo�e zainstalowa� aplikacji na dysku sieciowym.
CannotInstallToUNCPath=Instalator nie mo�e zainstalowa� aplikacji w �cie�ce UNC.
InvalidPath=Nale�y wprowadzi� pe�n� �cie�k� wraz z liter� dysku, np.:%n%nC:\PROGRAM%n%nlub �cie�k� sieciow� (UNC) w formacie:%n%n\\serwer\udzia�
InvalidDrive=Wybrany dysk lub udost�pniony folder sieciowy nie istnieje. Prosz� wybra� inny.
DiskSpaceWarningTitle=Niewystarczaj�ca ilo�� wolnego miejsca na dysku
DiskSpaceWarning=Instalator wymaga co najmniej %1 KB wolnego miejsca na dysku. Wybrany dysk posiada tylko %2 KB dost�pnego miejsca.%n%nCzy mimo to chcesz kontynuowa�?
DirNameTooLong=Nazwa folderu lub �cie�ki jest za d�uga.
InvalidDirName=Niepoprawna nazwa folderu.
BadDirName32=Nazwa folderu nie mo�e zawiera� �adnego z nast�puj�cych znak�w:%n%n%1
DirExistsTitle=Folder ju� istnieje
DirExists=Poni�szy folder ju� istnieje:%n%n%1%n%nCzy mimo to chcesz zainstalowa� aplikacj� w tym folderze?
DirDoesntExistTitle=Folder nie istnieje
DirDoesntExist=Poni�szy folder nie istnieje:%n%n%1%n%nCzy chcesz, aby zosta� utworzony?

; *** "Select Components" wizard page
WizardSelectComponents=Komponenty instalacji
SelectComponentsDesc=Kt�re komponenty maj� zosta� zainstalowane?
SelectComponentsLabel2=Zaznacz komponenty, kt�re chcesz zainstalowa� i odznacz te, kt�rych nie chcesz zainstalowa�. Kliknij przycisk Dalej, aby kontynuowa�.
FullInstallation=Instalacja pe�na
; if possible don't translate 'Compact' as 'Minimal' (I mean 'Minimal' in your language)
CompactInstallation=Instalacja podstawowa
CustomInstallation=Instalacja u�ytkownika
NoUninstallWarningTitle=Zainstalowane komponenty
NoUninstallWarning=Instalator wykry�, �e na komputerze s� ju� zainstalowane nast�puj�ce komponenty:%n%n%1%n%nOdznaczenie kt�regokolwiek z nich nie spowoduje ich dezinstalacji.%n%nCzy pomimo tego chcesz kontynuowa�?
ComponentSize1=%1 KB
ComponentSize2=%1 MB
ComponentsDiskSpaceGBLabel=Wybrane komponenty wymagaj� co najmniej [gb] GB na dysku.
ComponentsDiskSpaceMBLabel=Wybrane komponenty wymagaj� co najmniej [mb] MB na dysku.

; *** "Select Additional Tasks" wizard page
WizardSelectTasks=Zadania dodatkowe
SelectTasksDesc=Kt�re zadania dodatkowe maj� zosta� wykonane?
SelectTasksLabel2=Zaznacz dodatkowe zadania, kt�re instalator ma wykona� podczas instalacji aplikacji [name], a nast�pnie kliknij przycisk Dalej, aby kontynuowa�.

; *** "Select Start Menu Folder" wizard page
WizardSelectProgramGroup=Folder Menu Start
SelectStartMenuFolderDesc=Gdzie maj� zosta� umieszczone skr�ty do aplikacji?
SelectStartMenuFolderLabel3=Instalator utworzy skr�ty do aplikacji we wskazanym poni�ej folderze Menu Start.
SelectStartMenuFolderBrowseLabel=Kliknij przycisk Dalej, aby kontynuowa�. Je�li chcesz wskaza� inny folder, kliknij przycisk Przegl�daj.
MustEnterGroupName=Musisz wprowadzi� nazw� folderu.
GroupNameTooLong=Nazwa folderu lub �cie�ki jest za d�uga.
InvalidGroupName=Niepoprawna nazwa folderu.
BadGroupName=Nazwa folderu nie mo�e zawiera� �adnego z nast�puj�cych znak�w:%n%n%1
NoProgramGroupCheck2=&Nie tw�rz folderu w Menu Start
	
; *** "Ready to Install" wizard page
WizardReady=Gotowy do rozpocz�cia instalacji
ReadyLabel1=Instalator jest ju� gotowy do rozpocz�cia instalacji aplikacji [name] na komputerze.
ReadyLabel2a=Kliknij przycisk Instaluj, aby rozpocz�� instalacj� lub Wstecz, je�li chcesz przejrze� lub zmieni� ustawienia.
ReadyLabel2b=Kliknij przycisk Instaluj, aby kontynuowa� instalacj�.
ReadyMemoUserInfo=Dane u�ytkownika:
ReadyMemoDir=Lokalizacja docelowa:
ReadyMemoType=Rodzaj instalacji:
ReadyMemoComponents=Wybrane komponenty:
ReadyMemoGroup=Folder w Menu Start:
ReadyMemoTasks=Dodatkowe zadania:
  
; *** "Preparing to Install" wizard page
WizardPreparing=Przygotowanie do instalacji
PreparingDesc=Instalator przygotowuje instalacj� aplikacji [name] na komputerze.
PreviousInstallNotCompleted=Instalacja/dezinstalacja poprzedniej wersji aplikacji nie zosta�a zako�czona. Aby zako�czy� instalacj�, nale�y ponownie uruchomi� komputer. %n%nNast�pnie ponownie uruchom instalator, aby zako�czy� instalacj� aplikacji [name].
CannotContinue=Instalator nie mo�e kontynuowa�. Kliknij przycisk Anuluj, aby przerwa� instalacj�.
ApplicationsFound=Poni�sze aplikacje u�ywaj� plik�w, kt�re musz� zosta� uaktualnione przez instalator. Zaleca si� zezwoli� na automatyczne zamkni�cie tych aplikacji przez program instalacyjny.
ApplicationsFound2=Poni�sze aplikacje u�ywaj� plik�w, kt�re musz� zosta� uaktualnione przez instalator. Zaleca si� zezwoli� na automatyczne zamkni�cie tych aplikacji przez program instalacyjny. Po zako�czonej instalacji instalator podejmie pr�b� ich ponownego uruchomienia.
CloseApplications=&Automatycznie zamknij aplikacje
DontCloseApplications=&Nie zamykaj aplikacji
ErrorCloseApplications=Instalator nie by� w stanie automatycznie zamkn�� wymaganych aplikacji. Zalecane jest zamkni�cie wszystkich aplikacji, kt�re aktualnie u�ywaj� uaktualnianych przez program instalacyjny plik�w.
PrepareToInstallNeedsRestart=Instalator wymaga ponownego uruchomienia komputera. Po zrestartowaniu komputera uruchom instalator ponownie, by doko�czy� proces instalacji aplikacji [name].%n%nCzy chcesz teraz uruchomi� komputer ponownie?

; *** "Installing" wizard page
WizardInstalling=Instalacja
InstallingLabel=Poczekaj, a� instalator zainstaluje aplikacj� [name] na komputerze.
 
; *** "Setup Completed" wizard page
FinishedHeadingLabel=Zako�czono instalacj� aplikacji [name]
FinishedLabelNoIcons=Instalator zako�czy� instalacj� aplikacji [name] na komputerze.
FinishedLabel=Instalator zako�czy� instalacj� aplikacji [name] na komputerze. Aplikacja mo�e by� uruchomiona poprzez u�ycie zainstalowanych skr�t�w.
ClickFinish=Kliknij przycisk Zako�cz, aby zako�czy� instalacj�.
FinishedRestartLabel=Aby zako�czy� instalacj� aplikacji [name], instalator musi ponownie uruchomi� komputer. Czy chcesz teraz uruchomi� komputer ponownie?
FinishedRestartMessage=Aby zako�czy� instalacj� aplikacji [name], instalator musi ponownie uruchomi� komputer.%n%nCzy chcesz teraz uruchomi� komputer ponownie?
ShowReadmeCheck=Tak, chc� przeczyta� dodatkowe informacje
YesRadio=&Tak, uruchom ponownie teraz
NoRadio=&Nie, uruchomi� ponownie p�niej
; used for example as 'Run MyProg.exe'
RunEntryExec=Uruchom aplikacj� %1
; used for example as 'View Readme.txt'
RunEntryShellExec=Wy�wietl plik %1
 
; *** "Setup Needs the Next Disk" stuff
ChangeDiskTitle=Instalator potrzebuje kolejnego archiwum
SelectDiskLabel2=Prosz� w�o�y� dysk %1 i klikn�� przycisk OK.%n%nJe�li wymieniony poni�ej folder nie okre�la po�o�enia plik�w z tego dysku, prosz� wprowadzi� poprawn� �cie�k� lub klikn�� przycisk Przegl�daj.
PathLabel=�&cie�ka:
FileNotInDir2=�cie�ka "%2" nie zawiera pliku "%1". Prosz� w�o�y� w�a�ciwy dysk lub wybra� inny folder.
SelectDirectoryLabel=Prosz� okre�li� lokalizacj� kolejnego archiwum instalatora.
  
; *** Installation phase messages
SetupAborted=Instalacja nie zosta�a zako�czona.%n%nProsz� rozwi�za� problem i ponownie rozpocz�� instalacj�.
AbortRetryIgnoreSelectAction=Wybierz operacj�
AbortRetryIgnoreRetry=Spr�buj &ponownie
AbortRetryIgnoreIgnore=Z&ignoruj b��d i kontynuuj
AbortRetryIgnoreCancel=Przerwij instalacj�
  
; *** Installation status messages
StatusClosingApplications=Zamykanie aplikacji...
StatusCreateDirs=Tworzenie folder�w...
StatusExtractFiles=Dekompresja plik�w...
StatusCreateIcons=Tworzenie skr�t�w aplikacji...
StatusCreateIniEntries=Tworzenie zapis�w w plikach INI...
StatusCreateRegistryEntries=Tworzenie zapis�w w rejestrze...
StatusRegisterFiles=Rejestracja plik�w...
StatusSavingUninstall=Zapisywanie informacji o dezinstalacji...
StatusRunProgram=Ko�czenie instalacji...
StatusRestartingApplications=Ponowne uruchamianie aplikacji...
StatusRollback=Cofanie zmian...
 
; *** Misc. errors
ErrorInternal2=Wewn�trzny b��d: %1
ErrorFunctionFailedNoCode=B��d podczas wykonywania %1
ErrorFunctionFailed=B��d podczas wykonywania %1; kod %2
ErrorFunctionFailedWithMessage=B��d podczas wykonywania %1; kod %2.%n%3
ErrorExecutingProgram=Nie mo�na uruchomi�:%n%1

; *** Registry errors
ErrorRegOpenKey=B��d podczas otwierania klucza rejestru:%n%1\%2
ErrorRegCreateKey=B��d podczas tworzenia klucza rejestru:%n%1\%2
ErrorRegWriteKey=B��d podczas zapisu do klucza rejestru:%n%1\%2
 
; *** INI errors
ErrorIniEntry=B��d podczas tworzenia pozycji w pliku INI: "%1".
 
; *** File copying errors
FileAbortRetryIgnoreSkipNotRecommended=&Pomi� plik (niezalecane)
FileAbortRetryIgnoreIgnoreNotRecommended=Z&ignoruj b��d i kontynuuj (niezalecane)
SourceIsCorrupted=Plik �r�d�owy jest uszkodzony
SourceDoesntExist=Plik �r�d�owy "%1" nie istnieje
ExistingFileReadOnly2=Istniej�cy plik nie mo�e zosta� zast�piony, gdy� jest oznaczony jako "Tylko do odczytu".
ExistingFileReadOnlyRetry=&Usu� atrybut "Tylko do odczytu" i spr�buj ponownie
ExistingFileReadOnlyKeepExisting=&Zachowaj istniej�cy plik
ErrorReadingExistingDest=Wyst�pi� b��d podczas pr�by odczytu istniej�cego pliku:
FileExists=Plik ju� istnieje.%n%nCzy chcesz, aby instalator nadpisa� go w�asn� wersj�?
ExistingFileNewer=Istniej�cy plik jest nowszy ni� ten, kt�ry instalator pr�buje skopiowa�. Zalecanym jest zachowanie istniej�cego pliku.%n%nCzy chcesz zachowa� istniej�cy plik?
ErrorChangingAttr=Wyst�pi� b��d podczas pr�by zmiany atrybut�w pliku docelowego:
ErrorCreatingTemp=Wyst�pi� b��d podczas pr�by utworzenia pliku w folderze docelowym:
ErrorReadingSource=Wyst�pi� b��d podczas pr�by odczytu pliku �r�d�owego:
ErrorCopying=Wyst�pi� b��d podczas pr�by kopiowania pliku:
ErrorReplacingExistingFile=Wyst�pi� b��d podczas pr�by zamiany istniej�cego pliku:
ErrorRestartReplace=Pr�ba zast�pienia plik�w przy ponownym uruchomieniu komputera nie powiod�a si�.
ErrorRenamingTemp=Wyst�pi� b��d podczas pr�by zmiany nazwy pliku w folderze docelowym:
ErrorRegisterServer=Nie mo�na zarejestrowa� DLL/OCX: %1
ErrorRegSvr32Failed=Funkcja RegSvr32 zako�czy�a si� z kodem b��du %1
ErrorRegisterTypeLib=Nie mog� zarejestrowa� biblioteki typ�w: %1

; *** Uninstall display name markings
; used for example as 'My Program (32-bit)'
UninstallDisplayNameMark=%1 (%2)
; used for example as 'My Program (32-bit, All users)'
UninstallDisplayNameMarks=%1 (%2, %3)
UninstallDisplayNameMark32Bit=wersja 32-bitowa
UninstallDisplayNameMark64Bit=wersja 64-bitowa
UninstallDisplayNameMarkAllUsers=wszyscy u�ytkownicy
UninstallDisplayNameMarkCurrentUser=bie��cy u�ytkownik

; *** Post-installation errors
ErrorOpeningReadme=Wyst�pi� b��d podczas pr�by otwarcia pliku z informacjami dodatkowymi.
ErrorRestartingComputer=Instalator nie m�g� ponownie uruchomi� tego komputera. Prosz� wykona� t� czynno�� samodzielnie.

; *** Uninstaller messages
UninstallNotFound=Plik "%1" nie istnieje. Nie mo�na przeprowadzi� dezinstalacji.
UninstallOpenError=Plik "%1" nie m�g� zosta� otwarty. Nie mo�na przeprowadzi� dezinstalacji.
UninstallUnsupportedVer=Ta wersja programu dezinstalacyjnego nie rozpoznaje formatu logu dezinstalacji w pliku "%1". Nie mo�na przeprowadzi� dezinstalacji.
UninstallUnknownEntry=W logu dezinstalacji wyst�pi�a nieznana pozycja (%1)
ConfirmUninstall=Czy na pewno chcesz usun�� aplikacj� %1 i wszystkie jej sk�adniki?
UninstallOnlyOnWin64=Ta aplikacja mo�e by� odinstalowana tylko w 64-bitowej wersji systemu Windows.
OnlyAdminCanUninstall=Ta instalacja mo�e by� odinstalowana tylko przez u�ytkownika z uprawnieniami administratora.
UninstallStatusLabel=Poczekaj, a� aplikacja %1 zostanie usuni�ta z komputera.
UninstalledAll=Aplikacja %1 zosta�a usuni�ta z komputera.
UninstalledMost=Dezinstalacja aplikacji %1 zako�czy�a si�.%n%nNiekt�re elementy nie mog�y zosta� usuni�te. Nale�y usun�� je samodzielnie.
UninstalledAndNeedsRestart=Komputer musi zosta� ponownie uruchomiony, aby zako�czy� proces dezinstalacji aplikacji %1.%n%nCzy chcesz teraz ponownie uruchomi� komputer?
UninstallDataCorrupted=Plik "%1" jest uszkodzony. Nie mo�na przeprowadzi� dezinstalacji.

; *** Uninstallation phase messages
ConfirmDeleteSharedFileTitle=Usun�� plik wsp�dzielony?
ConfirmDeleteSharedFile2=System wskazuje, i� nast�puj�cy plik nie jest ju� u�ywany przez �aden program. Czy chcesz odinstalowa� ten plik wsp�dzielony?%n%nJe�li inne programy nadal u�ywaj� tego pliku, a zostanie on usuni�ty, mog� one przesta� dzia�a� prawid�owo. W przypadku braku pewno�ci, kliknij przycisk Nie. Pozostawienie tego pliku w systemie nie spowoduje �adnych szk�d.
SharedFileNameLabel=Nazwa pliku:
SharedFileLocationLabel=Po�o�enie:
WizardUninstalling=Stan dezinstalacji
StatusUninstalling=Dezinstalacja aplikacji %1...

; *** Shutdown block reasons
ShutdownBlockReasonInstallingApp=Instalacja aplikacji %1.
ShutdownBlockReasonUninstallingApp=Dezinstalacja aplikacji %1.
 
; The custom messages below aren't used by Setup itself, but if you make
; use of them in your scripts, you'll want to translate them.
 
[CustomMessages]

NameAndVersion=%1 (wersja %2)
AdditionalIcons=Dodatkowe skr�ty:
CreateDesktopIcon=Utw�rz skr�t na &pulpicie
CreateQuickLaunchIcon=Utw�rz skr�t na pasku &szybkiego uruchamiania
ProgramOnTheWeb=Strona internetowa aplikacji %1
UninstallProgram=Dezinstalacja aplikacji %1
LaunchProgram=Uruchom aplikacj� %1
AssocFileExtension=&Przypisz aplikacj� %1 do rozszerzenia pliku %2
AssocingFileExtension=Przypisywanie aplikacji %1 do rozszerzenia pliku %2...
AutoStartProgramGroupDescription=Autostart:
AutoStartProgram=Automatycznie uruchamiaj aplikacj� %1
AddonHostProgramNotFound=Aplikacja %1 nie zosta�a znaleziona we wskazanym przez Ciebie folderze.%n%nCzy pomimo tego chcesz kontynuowa�?
STWinUSBDriverTaskDesc=Zainstaluj sterownik STM32 BOOTLOADER WinUSB (wymagany do flashowania oprogramowania układowego)
