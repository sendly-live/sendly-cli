# Homebrew formula for Sendly CLI
# To install: brew install sendly-live/tap/sendly

class Sendly < Formula
  desc "CLI for Sendly SMS API - Send SMS from your terminal"
  homepage "https://sendly.live"
  url "https://registry.npmjs.org/@sendly/cli/-/cli-3.0.3.tgz"
  sha256 "b14cf0ad0ed3d4683fb1b701193e4afb779b931eaeaf35bdfbd54ac9f236ac2c"
  license "MIT"

  depends_on "node" # Requires Node.js >= 18.0.0

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "sendly", shell_output("#{bin}/sendly --version")
  end
end
