# VSay Agent Downloads

Place your agent binaries in this folder with the following naming convention:

## Debian/Ubuntu (.deb packages)
- `wxt-agent-amd64.deb` - For AMD64 architecture
- `wxt-agent-arm64.deb` - For ARM64 architecture

## Rocky/CentOS/RHEL (.tar.gz archives)
- `wxt-agent-x86_64.tar.gz` - For x86_64 architecture
- `wxt-agent-aarch64.tar.gz` - For aarch64 architecture

## macOS (.dmg packages)
- `wxt-agent-amd64.dmg` - For Intel Macs (AMD64)
- `wxt-agent-arm64.dmg` - For Apple Silicon Macs (ARM64)

## Windows (.exe installers)
- `wxt-agent-amd64.exe` - For AMD64 architecture
- `wxt-agent-arm64.exe` - For ARM64 architecture

## Notes
- All files should be placed directly in this `downloads` folder
- The UI will automatically serve these files when users click the download button
- Make sure file permissions are correct for web serving
