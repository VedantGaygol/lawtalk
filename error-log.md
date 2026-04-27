[Instance] 2026/04/27 10:04:39.842656 Running on CodeBuild On-demand
[Instance] 2026/04/27 10:04:39.842668 Waiting for agent ping
[Instance] 2026/04/27 10:04:40.549500 Waiting for DOWNLOAD_SOURCE
[Instance] 2026/04/27 10:04:50.381997 Phase is DOWNLOAD_SOURCE
[Instance] 2026/04/27 10:04:50.469099 CODEBUILD_SRC_DIR=/tmp/codebuild/output/src3971531076/src/github.com/VedantGaygol/lawtalk
[Instance] 2026/04/27 10:04:50.469976 YAML location is /tmp/codebuild/output/src3971531076/src/github.com/VedantGaygol/lawtalk/buildspec.yml
[Instance] 2026/04/27 10:04:50.473862 Setting HTTP client timeout to higher timeout for Github and GitHub Enterprise sources
[Instance] 2026/04/27 10:04:50.474001 Processing environment variables
[Instance] 2026/04/27 10:04:50.764030 Moving to directory /tmp/codebuild/output/src3971531076/src/github.com/VedantGaygol/lawtalk
[Instance] 2026/04/27 10:04:50.764050 Cache is not defined in the buildspec
[Instance] 2026/04/27 10:04:50.959027 Skip cache due to: no paths specified to be cached
[Instance] 2026/04/27 10:04:50.959049 Registering with agent
[Instance] 2026/04/27 10:04:51.159198 Phases found in YAML: 3
[Instance] 2026/04/27 10:04:51.159216  POST_BUILD: 1 commands
[Instance] 2026/04/27 10:04:51.159220  INSTALL: 6 commands
[Instance] 2026/04/27 10:04:51.159223  BUILD: 4 commands
[Instance] 2026/04/27 10:04:51.159479 Phase complete: DOWNLOAD_SOURCE State: SUCCEEDED
[Instance] 2026/04/27 10:04:51.159495 Phase context status code:  Message: 
[Instance] 2026/04/27 10:04:51.607100 Entering phase INSTALL
[Instance] 2026/04/27 10:04:51.803270 Running command echo "Installing Node.js 20 using nvm"
Installing Node.js 20 using nvm

[Instance] 2026/04/27 10:04:51.810437 Running command curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v
npm -v

  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed

  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
100 16555  100 16555    0     0  1067k      0 --:--:-- --:--:-- --:--:-- 1077k
=> Downloading nvm from git to '/.nvm'

=> Cloning into '/.nvm'...
* (HEAD detached at FETCH_HEAD)
  master
=> Compressing and cleaning up git repository

=> Profile not found. Tried ~/.bashrc, ~/.bash_profile, ~/.zprofile, ~/.zshrc, and ~/.profile.
=> Create one of them and run this script again
   OR
=> Append the following lines to the correct file yourself:

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

=> You currently have modules installed globally with `npm`. These will no
=> longer be linked to the active version of Node when you install a new node
=> with `nvm`; and they may (depending on how you construct your `$PATH`)
=> override the binaries of modules installed with `nvm`:

/usr/local/lib/node-v18.20.8/lib
├── corepack@0.32.0
├── grunt-cli@1.5.0
├── grunt@1.6.1
├── webpack-cli@6.0.1
├── webpack@5.105.4
└── yarn@1.22.22
=> If you wish to uninstall them at a later point (or re-install them under your
=> `nvm` Nodes), you can remove them from the system Node as follows:

     $ nvm use system
     $ npm uninstall -g a_module

=> Close and reopen your terminal to start using nvm or run the following to use it now:

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
Downloading and installing node v20.20.2...
Downloading https://nodejs.org/dist/v20.20.2/node-v20.20.2-linux-x64.tar.xz...

##################                                                        26.3%
###############################################################           87.9%
######################################################################## 100.0%
Computing checksum with sha256sum
Checksums matched!
Now using node v20.20.2
tput: terminal attributes: No such device or address

Creating default alias: default -> 20 (-> v20.20.2 *)
Now using node v20.20.2
node: /lib64/libm.so.6: version `GLIBC_2.27' not found (required by node)
node: /lib64/libc.so.6: version `GLIBC_2.28' not found (required by node)
node: /lib64/libm.so.6: version `GLIBC_2.27' not found (required by node)
node: /lib64/libc.so.6: version `GLIBC_2.28' not found (required by node)

[Instance] 2026/04/27 10:05:15.841823 Command did not exit successfully curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v
npm -v
 exit status 1
[Instance] 2026/04/27 10:05:16.064366 Phase complete: INSTALL State: FAILED
[Instance] 2026/04/27 10:05:16.064385 Phase context status code: COMMAND_EXECUTION_ERROR Message: Error while executing command: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
node -v
npm -v
. Reason: exit status 1