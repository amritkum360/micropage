/**
 * Vercel Service for managing custom domains
 * This service handles adding and removing custom domains from Vercel projects
 */

class VercelService {
  constructor() {
    this.apiToken = process.env.VERCEL_API_TOKEN;
    this.projectId = process.env.VERCEL_PROJECT_ID;
    this.teamId = process.env.VERCEL_TEAM_ID; // Optional, for team accounts
    this.baseUrl = 'https://api.vercel.com';
  }

  /**
   * Get headers for Vercel API requests
   */
  getHeaders() {
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };

    if (this.teamId) {
      headers['x-vercel-team-id'] = this.teamId;
    }

    return headers;
  }

  /**
   * Add a custom domain to the Vercel project
   * @param {string} domain - The domain to add
   * @returns {Promise<Object>} - Response from Vercel API
   */
  async addCustomDomain(domain) {
    try {
      console.log('🌐 Vercel: Adding custom domain:', domain);

      if (!this.apiToken || !this.projectId) {
        throw new Error('Vercel API token or project ID not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            name: domain
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Vercel: Failed to add domain:', data);
        throw new Error(data.error?.message || `Failed to add domain: ${response.status}`);
      }

      console.log('✅ Vercel: Domain added successfully:', data);
      return {
        success: true,
        domain: data.name,
        status: data.status,
        verification: data.verification,
        data
      };

    } catch (error) {
      console.error('❌ Vercel: Error adding custom domain:', error);
      return {
        success: false,
        error: error.message,
        domain
      };
    }
  }

  /**
   * Remove a custom domain from the Vercel project
   * @param {string} domain - The domain to remove
   * @returns {Promise<Object>} - Response from Vercel API
   */
  async removeCustomDomain(domain) {
    try {
      console.log('🌐 Vercel: Removing custom domain:', domain);

      if (!this.apiToken || !this.projectId) {
        throw new Error('Vercel API token or project ID not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains/${domain}`,
        {
          method: 'DELETE',
          headers: this.getHeaders()
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Vercel: Failed to remove domain:', errorData);
        throw new Error(errorData.error?.message || `Failed to remove domain: ${response.status}`);
      }

      console.log('✅ Vercel: Domain removed successfully');
      return {
        success: true,
        domain
      };

    } catch (error) {
      console.error('❌ Vercel: Error removing custom domain:', error);
      return {
        success: false,
        error: error.message,
        domain
      };
    }
  }

  /**
   * Get all custom domains for the project
   * @returns {Promise<Object>} - List of domains
   */
  async getCustomDomains() {
    try {
      console.log('🌐 Vercel: Fetching custom domains');

      if (!this.apiToken || !this.projectId) {
        throw new Error('Vercel API token or project ID not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Vercel: Failed to fetch domains:', data);
        throw new Error(data.error?.message || `Failed to fetch domains: ${response.status}`);
      }

      console.log('✅ Vercel: Domains fetched successfully:', data.domains?.length || 0);
      return {
        success: true,
        domains: data.domains || []
      };

    } catch (error) {
      console.error('❌ Vercel: Error fetching custom domains:', error);
      return {
        success: false,
        error: error.message,
        domains: []
      };
    }
  }

  /**
   * Get domain verification status
   * @param {string} domain - The domain to check
   * @returns {Promise<Object>} - Domain verification status
   */
  async getDomainStatus(domain) {
    try {
      console.log('🌐 Vercel: Checking domain status:', domain);

      if (!this.apiToken || !this.projectId) {
        throw new Error('Vercel API token or project ID not configured');
      }

      const response = await fetch(
        `${this.baseUrl}/v10/projects/${this.projectId}/domains/${domain}`,
        {
          method: 'GET',
          headers: this.getHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Vercel: Failed to get domain status:', data);
        throw new Error(data.error?.message || `Failed to get domain status: ${response.status}`);
      }

      console.log('✅ Vercel: Domain status fetched:', data);
      return {
        success: true,
        domain: data.name,
        status: data.status,
        verification: data.verification,
        data
      };

    } catch (error) {
      console.error('❌ Vercel: Error getting domain status:', error);
      return {
        success: false,
        error: error.message,
        domain
      };
    }
  }

  /**
   * Check if Vercel service is properly configured
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return !!(this.apiToken && this.projectId);
  }

  /**
   * Get configuration status
   * @returns {Object} - Configuration status
   */
  getConfigStatus() {
    return {
      hasApiToken: !!this.apiToken,
      hasProjectId: !!this.projectId,
      hasTeamId: !!this.teamId,
      isConfigured: this.isConfigured()
    };
  }
}

// Export singleton instance
const vercelService = new VercelService();
module.exports = vercelService;
