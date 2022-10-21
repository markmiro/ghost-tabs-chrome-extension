# Make sure you've installed imagemagick
# `brew install imagemagick` on macOS with homebrew
magick convert generated/for-ico16.png generated/for-ico32.png generated/for-ico64.png generated/ico.ico
magick convert generated/for-ico16.png generated/ico16.ico