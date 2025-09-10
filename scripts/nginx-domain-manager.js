#!/usr/bin/env node

/**
 * Nginx Domain Manager for VPS
 * Automatically manages custom domains without manual nginx config edits
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class NginxDomainManager {
  constructor() {
    this.nginxConfigPath = '/etc/nginx/sites-available/aboutwebsite.in';
    this.backupPath = '/etc/nginx/sites-available/aboutwebsite.in.backup';
  }

  /**
   * Create a universal nginx config that handles all custom domains automatically
   */
  async createUniversalConfig() {
    const config = `# ------------------------------
# Redirect HTTP -> HTTPS (ONLY for main domain + subdomains)
# ------------------------------
server {
    listen 80;
    server_name aboutwebsite.in www.aboutwebsite.in *.aboutwebsite.in;
    return 301 https://$host$request_uri;
}

# ------------------------------
# HTTPS block for main domain + subdomains
# ------------------------------
server {
    listen 443 ssl;
    server_name aboutwebsite.in www.aboutwebsite.in *.aboutwebsite.in;

    ssl_certificate /etc/letsencrypt/live/aboutwebsite.in-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aboutwebsite.in-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:3000;   # Next.js frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# ------------------------------
# Universal Custom Domain Handler (HTTP)
# This catches ALL custom domains and forwards to backend
# ------------------------------
server {
    listen 80;
    server_name _;
    
    # Add debugging headers
    add_header X-Custom-Domain "true" always;
    add_header X-Backend-Port "5000" always;
    add_header X-Requested-Host $host always;
    
    location / {
        proxy_pass http://localhost:5000;   # Backend with website data
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;   # Critical for domain resolution
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# ------------------------------
# n8n subdomain -> port 5678
# ------------------------------
server {
    listen 80;
    server_name n8n.srv992268.hstgr.cloud;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

    try {
      // Create backup
      if (fs.existsSync(this.nginxConfigPath)) {
        await execAsync(`sudo cp ${this.nginxConfigPath} ${this.backupPath}`);
        console.log('✅ Backup created:', this.backupPath);
      }

      // Write new config
      await execAsync(`sudo tee ${this.nginxConfigPath} > /dev/null`, { input: config });
      console.log('✅ Universal nginx config created');

      // Test config
      await execAsync('sudo nginx -t');
      console.log('✅ Nginx config test passed');

      // Reload nginx
      await execAsync('sudo systemctl reload nginx');
      console.log('✅ Nginx reloaded successfully');

      return true;
    } catch (error) {
      console.error('❌ Error creating universal config:', error.message);
      return false;
    }
  }

  /**
   * Test if a custom domain is working
   */
  async testCustomDomain(domain) {
    try {
      const { stdout } = await execAsync(`curl -s -H "Host: ${domain}" http://localhost:5000`);
      return {
        success: true,
        response: stdout.substring(0, 200) + '...'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get nginx status
   */
  async getNginxStatus() {
    try {
      const { stdout } = await execAsync('sudo systemctl status nginx --no-pager');
      return {
        status: 'running',
        details: stdout
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check if backend is running
   */
  async checkBackend() {
    try {
      const { stdout } = await execAsync('sudo netstat -tlnp | grep :5000');
      return {
        running: true,
        details: stdout
      };
    } catch (error) {
      return {
        running: false,
        error: 'Backend not running on port 5000'
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const manager = new NginxDomainManager();
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      console.log('🚀 Setting up universal nginx config...');
      manager.createUniversalConfig().then(success => {
        if (success) {
          console.log('🎉 Universal nginx config setup complete!');
          console.log('📋 Now any custom domain will automatically work without manual config edits.');
        } else {
          console.log('❌ Setup failed. Check the errors above.');
        }
      });
      break;

    case 'test':
      const domain = process.argv[3];
      if (!domain) {
        console.log('❌ Please provide a domain to test: node nginx-domain-manager.js test example.com');
        process.exit(1);
      }
      console.log(`🧪 Testing custom domain: ${domain}`);
      manager.testCustomDomain(domain).then(result => {
        if (result.success) {
          console.log('✅ Domain test successful!');
          console.log('Response:', result.response);
        } else {
          console.log('❌ Domain test failed:', result.error);
        }
      });
      break;

    case 'status':
      console.log('📊 Checking system status...');
      Promise.all([
        manager.getNginxStatus(),
        manager.checkBackend()
      ]).then(([nginxStatus, backendStatus]) => {
        console.log('\n🌐 Nginx Status:', nginxStatus.status);
        console.log('🔧 Backend Status:', backendStatus.running ? 'Running' : 'Not Running');
        if (!backendStatus.running) {
          console.log('❌ Backend Error:', backendStatus.error);
        }
      });
      break;

    default:
      console.log(`
🌐 Nginx Domain Manager for VPS

Usage:
  node nginx-domain-manager.js setup    - Create universal nginx config
  node nginx-domain-manager.js test <domain> - Test a custom domain
  node nginx-domain-manager.js status   - Check system status

Examples:
  node nginx-domain-manager.js setup
  node nginx-domain-manager.js test example.com
  node nginx-domain-manager.js status
      `);
  }
}

module.exports = NginxDomainManager;
