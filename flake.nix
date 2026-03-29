{
  description = "OpenRouter model response tester — compare model outputs using defined system and user prompts";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_22;
      in
      {
        # `nix develop` — drop into a shell with Node 22 + npm
        devShells.default = pkgs.mkShell {
          buildInputs = [ nodejs ];
          shellHook = ''
            echo "systemprompt-example dev shell"
            echo "  Node $(node --version)  npm $(npm --version)"
            echo ""
            echo "  npm install   — install dependencies"
            echo "  npm start     — run against all models in models.json"
            echo "  npm start -- --model <id>  — run a single model"
            echo ""
            if [ ! -f .env ]; then
              echo "  ⚠  .env not found — copy .env.example and add OPENROUTER_API_KEY"
            fi
          '';
        };

        # `nix run` — run the CLI directly (requires node_modules present)
        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScript "systemprompt-example" ''
            cd "$(dirname "$0")/../.."
            exec ${nodejs}/bin/node --import tsx/esm ${./src/index.ts} "$@"
          '');
        };
      }
    );
}
