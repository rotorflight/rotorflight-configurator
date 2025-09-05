{
  description = "Rotorflight Configurator";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ nixpkgs, flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" ];

      perSystem = { pkgs, system, ... }:
      let

        nixpatchbins = pkgs.writers.writeBashBin "nixpatchbins" ''
          set -o errexit || exit; set -o nounset; set -o pipefail

          NIX_LD="${pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker"}";
          NIX_LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
            pkgs.stdenv.cc.cc
          ]}";

          if [[ ! -f /etc/os-release ]] || ! grep -q 'ID=nixos' /etc/os-release; then
            exit 0 # Not a NixOS system, skipping patching.
          fi

          BIN_EXECUTABLES_TO_PATCH=(
            $(cd node_modules/sass-embedded && node -e 'console.log(require.resolve("sass-embedded-linux-x64/dart-sass/src/dart"))')
          )

          for bin_executable_path in "''${BIN_EXECUTABLES_TO_PATCH[@]}"; do
            (set -o xtrace; ${pkgs.lib.getExe pkgs.patchelf} --set-interpreter "$NIX_LD" "$bin_executable_path")
          done
        '';

        androidToolsVersion = "35.0.1";
        androidComposition = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [
            "34"
            "35"
            "latest"
          ];
          platformToolsVersion = androidToolsVersion;
          buildToolsVersions = [ androidToolsVersion ];
          includeEmulator = true;
          includeSystemImages = true;
          systemImageTypes = [ "default" ];
          abiVersions = [
            "armeabi-v7a"
            "arm64-v8a"
            "x86_64"
          ];
          includeNDK = true;
          includeExtras = [ "extras;google;auto" ];
        };
        /*
        emulator = pkgs.androidenv.emulateApp {
          name = "emulate-rotorflight-configurator";
          platformVersion = "35";
          abiVersion = "x86_64"; # armeabi-v7a, mips, x86_64
        };
        */
      in {
        _module.args.pkgs = import inputs.nixpkgs {
          inherit system;
          config = {
            android_sdk.accept_license = true;
            allowUnfreePredicate = pkg: builtins.elem (pkgs.lib.getName pkg) [
              "android-sdk-cmdline-tools"
              "android-sdk-platform-tools"
              "platform-tools"
              "android-sdk-tools"
              "android-sdk-build-tools"
              "android-sdk-platforms"
              "android-sdk-emulator"
              "android-sdk-system-image-34-default-arm64-v8a-system-image-34-default-x86_64"
              "android-sdk-system-image-35-default-arm64-v8a-system-image-35-default-x86_64"
              "system-image-34-default-arm64-v8a"
              "system-image-35-default-arm64-v8a"
              "system-image-35-default-x86_64"
              "system-image-34-default-x86_64"
              "android-sdk-ndk"
              "android-sdk-extras-google-auto"
              "extras-google-auto"
              "cmdline-tools"
              "emulator"
              "build-tools"
              "ndk"
              "platforms"
              "cmake"
              "tools"
            ];
          };
        };

        devShells.default = pkgs.mkShell rec {
          packages = with pkgs; [
            nodejs_24
            nodejs_24.pkgs.pnpm
            nixpatchbins
          ];

          nativeBuildInputs = with pkgs; [
            rpm
            dpkg
            zulu17
            gradle
            androidComposition.androidsdk
          ];

          ANDROID_HOME = "${androidComposition.androidsdk}/libexec/android-sdk";
          ANDROID_NDK_ROOT = "${ANDROID_HOME}/ndk-bundle";
          # override the aapt2 that gradle uses with the nix-shipped version
          GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${ANDROID_HOME}/build-tools/${androidToolsVersion}/aapt2";
        };

      };
    };
}
