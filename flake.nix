{
  description = "Rotorflight Configurator";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ nixpkgs, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" ];
      perSystem = { pkgs, ... }:
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
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_24
            nodejs_24.pkgs.pnpm
            nixpatchbins
          ];
        };
      };
    };
}
