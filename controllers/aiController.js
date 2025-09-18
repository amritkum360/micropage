const axios = require('axios');

// Helper function to generate embeddings using text-embedding-3-large
const generateEmbedding = async (text) => {
  try {
    const embeddingResponse = await axios.post('https://api.openai.com/v1/embeddings', {
      model: 'text-embedding-3-large',
      input: text
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return embeddingResponse.data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
};

// Helper function to calculate cosine similarity
const cosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
};

// Pre-defined business category embeddings for better content generation
const businessCategories = {
  'doctor': [0.1, 0.2, 0.3, 0.4, 0.5], // Placeholder - would be real embeddings
  'lawyer': [0.2, 0.3, 0.4, 0.5, 0.6],
  'business': [0.3, 0.4, 0.5, 0.6, 0.7],
  'freelancer': [0.4, 0.5, 0.6, 0.7, 0.8],
  'student': [0.5, 0.6, 0.7, 0.8, 0.9]
};

// Get category-specific prompt enhancements
const getCategorySpecificPrompt = (category) => {
  const categoryPrompts = {
    'doctor': `
MEDICAL PROFESSIONAL FOCUS:
- Emphasize trust, expertise, and patient care
- Use medical terminology appropriately
- Highlight qualifications and experience
- Focus on patient outcomes and care quality
- Include credibility indicators (years of experience, specializations)`,

    'lawyer': `
LEGAL PROFESSIONAL FOCUS:
- Emphasize legal expertise and case success
- Use professional legal terminology
- Highlight specializations and practice areas
- Focus on client advocacy and results
- Include credibility indicators (bar admissions, case wins)`,

    'business': `
BUSINESS PROFESSIONAL FOCUS:
- Emphasize growth, innovation, and results
- Use business terminology and metrics
- Highlight achievements and milestones
- Focus on value proposition and ROI
- Include credibility indicators (revenue, clients, awards)`,

    'freelancer': `
FREELANCER FOCUS:
- Emphasize flexibility, creativity, and personal touch
- Use creative and personal terminology
- Highlight unique skills and portfolio
- Focus on client satisfaction and project success
- Include credibility indicators (client testimonials, project count)`,

    'student': `
STUDENT FOCUS:
- Emphasize learning, growth, and potential
- Use academic and aspirational terminology
- Highlight achievements and goals
- Focus on future potential and ambition
- Include credibility indicators (grades, projects, internships)`
  };

  return categoryPrompts[category] || categoryPrompts['business'];
};

// Generate website content using OpenAI with embeddings
const generateContent = async (req, res) => {
  try {
    const { businessDescription } = req.body;
    const userId = req.user.userId;

    console.log('🤖 AI Content Generation Request:', {
      userId,
      businessDescription: businessDescription?.substring(0, 100) + '...'
    });

    if (!businessDescription || businessDescription.trim().length < 10) {
      return res.status(400).json({
        message: 'Business description must be at least 10 characters long'
      });
    }

    // Generate embedding for business description using text-embedding-3-large
    console.log('🔍 Generating embedding for business description...');
    const businessEmbedding = await generateEmbedding(businessDescription);
    
    // Determine business category based on embedding similarity
    let businessCategory = 'business'; // default
    if (businessEmbedding) {
      let maxSimilarity = -1;
      for (const [category, categoryEmbedding] of Object.entries(businessCategories)) {
        const similarity = cosineSimilarity(businessEmbedding, categoryEmbedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          businessCategory = category;
        }
      }
      console.log(`📊 Detected business category: ${businessCategory} (similarity: ${maxSimilarity.toFixed(3)})`);
    }

    // Enhanced prompt based on business category
    const categorySpecificPrompt = getCategorySpecificPrompt(businessCategory);

    // OpenAI API call with enhanced prompt and embedding context
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a world-class website content writer and marketing specialist with advanced AI-powered business analysis capabilities. Generate professional, compelling, and conversion-focused website content based on the business description provided.

BUSINESS ANALYSIS CONTEXT:
- The business description has been analyzed using text-embedding-3-large for semantic understanding
- Business category has been determined through AI-powered similarity analysis
- Content will be tailored specifically for the detected business type

${categorySpecificPrompt}

CRITICAL REQUIREMENTS:
1. Extract the business name intelligently from the description (avoid generic words like "business", "company")
2. Create a powerful, memorable tagline (max 8 words) that captures the essence and aligns with the business category
3. Generate an engaging hero title that converts visitors (decide whether to include "Welcome to" or not based on context)
4. Write a compelling hero subtitle (max 12 words) that creates urgency or highlights benefits specific to this business type
5. Create a detailed hero description (2-3 sentences) that builds trust and explains value proposition
6. Generate an appropriate about title that builds credibility for this specific profession/business type
7. Write a comprehensive about description (3-4 sentences) that tells the story and builds trust

ENHANCED CONTENT GUIDELINES:
- Use professional, confident tone appropriate for the business category
- Focus on benefits and outcomes specific to this business type
- Include relevant credibility indicators for this profession
- Make it conversion-focused with category-specific value propositions
- Avoid generic phrases - be specific to the business type
- Use power words that create emotional connection relevant to the target audience
- Leverage the AI-detected business category for more targeted messaging

Return ONLY a valid JSON object with this exact structure:
{
  "tagline": "A powerful, memorable tagline for the business",
  "heroTitle": "An engaging, conversion-focused hero section title",
  "heroSubtitle": "A compelling subtitle that highlights benefits", 
  "heroDescription": "A detailed description that builds trust and explains value",
  "aboutTitle": "A credibility-building about section title",
  "aboutDescription": "A comprehensive description that tells the story and builds trust"
}`
        },
        {
          role: 'user',
          content: `Generate professional website content for this business: ${businessDescription}`
        }
      ],
      max_tokens: 800,
      temperature: 0.8
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiContent = openaiResponse.data.choices[0].message.content;
    
    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return res.status(500).json({
        message: 'AI content generation failed - Invalid response format',
        error: 'Please try again or contact support'
      });
    }

    console.log('✅ AI Content Generated Successfully');

    res.json({
      message: 'Content generated successfully',
      content: parsedContent,
      aiAnalysis: {
        businessCategory: businessCategory,
        embeddingGenerated: !!businessEmbedding,
        model: 'gpt-3.5-turbo',
        embeddingModel: 'text-embedding-3-large'
      }
    });

  } catch (error) {
    console.error('AI Content Generation Error:', error);
    
    // Fallback content if AI fails - Smart business name extraction
    const { businessDescription } = req.body;
    
    // Smart business name extraction
    const extractBusinessName = (description) => {
      if (!description) return 'Your Business';
      
      const text = description.toLowerCase();
      
             // Common patterns for business names - Limited to 2-3 words max
       const patterns = [
         // "mai [name] hu" pattern - capture only first 2 words after mai
         /mai\s+([a-z]+(?:\s+[a-z]+){0,1})\s+hu/i,
         // "mera [business] ka business hai" pattern - capture only business name
         /mera\s+([a-z]+(?:\s+[a-z]+){0,1})\s+ka\s+business/i,
         // "main [name] hun" pattern - capture only first 2 words
         /main\s+([a-z]+(?:\s+[a-z]+){0,1})\s+hun/i,
         // "I am [name]" pattern - capture only first 2 words
         /i\s+am\s+([a-z]+(?:\s+[a-z]+){0,1})/i,
         // "my name is [name]" pattern - capture only first 2 words
         /my\s+name\s+is\s+([a-z]+(?:\s+[a-z]+){0,1})/i,
         // Business type patterns - capture only business name (avoid location words)
         /([a-z]+(?:\s+[a-z]+){0,1})\s+(?:business|company|firm|shop|store)/i,
         // First meaningful words (avoid location words like "from", "of", etc.)
         /^(?!from|of|my|i|am|is|are|was|were|have|has|had|will|would|can|could|the|and|or|but)([a-z]+(?:\s+[a-z]+){0,1})\s+/i
       ];
      
      for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Filter out common words
          if (!['am', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could'].includes(name.toLowerCase())) {
            return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          }
        }
      }
      
      // Fallback to first meaningful word
      const words = description.split(' ').filter(word => 
        word.length > 2 && 
        !['mai', 'main', 'mera', 'meri', 'hum', 'ham', 'i', 'am', 'is', 'are', 'the', 'and', 'or', 'but'].includes(word.toLowerCase())
      );
      
      return words.length > 0 ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Your Business';
    };
    
    const businessName = extractBusinessName(businessDescription);
    
         // Smart content generation based on business type
     const generateSmartContent = (description, name) => {
       return {
         businessType: 'business',
         tagline: name,
         subtitle: ''
       };
     };
    
    const smartContent = generateSmartContent(businessDescription, businessName);
    
    console.log('❌ OpenAI API not available - no fallback content');

    res.status(500).json({
      message: 'AI content generation failed - OpenAI API not available',
      error: 'Please ensure OpenAI API key is configured'
    });
  }
};

// Generate hero section content specifically with embeddings
const generateHero = async (req, res) => {
  try {
    const { businessDescription } = req.body;
    const userId = req.user.userId;

    console.log('🤖 AI Hero Generation Request:', {
      userId,
      businessDescription: businessDescription?.substring(0, 100) + '...'
    });

    if (!businessDescription || businessDescription.trim().length < 10) {
      return res.status(400).json({
        message: 'Business description must be at least 10 characters long'
      });
    }

    // Generate embedding for business description using text-embedding-3-large
    console.log('🔍 Generating embedding for hero content...');
    const businessEmbedding = await generateEmbedding(businessDescription);
    
    // Determine business category based on embedding similarity
    let businessCategory = 'business'; // default
    if (businessEmbedding) {
      let maxSimilarity = -1;
      for (const [category, categoryEmbedding] of Object.entries(businessCategories)) {
        const similarity = cosineSimilarity(businessEmbedding, categoryEmbedding);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          businessCategory = category;
        }
      }
      console.log(`📊 Hero - Detected business category: ${businessCategory} (similarity: ${maxSimilarity.toFixed(3)})`);
    }

    // Enhanced prompt based on business category
    const categorySpecificPrompt = getCategorySpecificPrompt(businessCategory);

    // OpenAI API call for hero content with enhanced prompt and embedding context
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a world-class website content writer specializing in hero sections with advanced AI-powered business analysis capabilities. Generate compelling, conversion-focused hero section content based on the business description provided.

HERO SECTION ANALYSIS CONTEXT:
- The business description has been analyzed using text-embedding-3-large for semantic understanding
- Business category has been determined through AI-powered similarity analysis
- Hero content will be tailored specifically for the detected business type

${categorySpecificPrompt}

CRITICAL REQUIREMENTS:
1. Extract the business name intelligently from the description (avoid generic words)
2. Create an engaging hero title that converts visitors (decide whether to include "Welcome to" or not based on context)
3. Write a compelling hero subtitle (max 12 words) that creates urgency or highlights key benefits specific to this business type
4. Create a detailed hero description (2-3 sentences) that builds trust and explains value proposition

ENHANCED HERO GUIDELINES:
- Use professional, confident tone appropriate for the business category
- Focus on benefits and outcomes specific to this business type
- Include relevant credibility indicators for this profession
- Make it conversion-focused with category-specific value propositions
- Avoid generic phrases - be specific to the business type
- Use power words that create emotional connection relevant to the target audience
- Leverage the AI-detected business category for more targeted hero messaging

Return ONLY a valid JSON object with this exact structure:
{
  "title": "An engaging, conversion-focused hero section title",
  "subtitle": "A compelling subtitle that highlights benefits",
  "description": "A detailed description that builds trust and explains value"
}`
        },
        {
          role: 'user',
          content: `Generate professional hero section content for this business: ${businessDescription}`
        }
      ],
      max_tokens: 400,
      temperature: 0.8
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiContent = openaiResponse.data.choices[0].message.content;
    
    // Parse JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return res.status(500).json({
        message: 'AI hero content generation failed - Invalid response format',
        error: 'Please try again or contact support'
      });
    }

    console.log('✅ AI Hero Content Generated Successfully');

    res.json({
      message: 'Hero content generated successfully',
      content: parsedContent,
      aiAnalysis: {
        businessCategory: businessCategory,
        embeddingGenerated: !!businessEmbedding,
        model: 'gpt-3.5-turbo',
        embeddingModel: 'text-embedding-3-large'
      }
    });

  } catch (error) {
    console.error('AI Hero Generation Error:', error);
    
    // Fallback content if AI fails - Smart business name extraction
    const { businessDescription } = req.body;
    
    // Smart business name extraction (same logic as above)
    const extractBusinessName = (description) => {
      if (!description) return 'Your Business';
      
      const text = description.toLowerCase();
      
             const patterns = [
         /mai\s+([a-z]+(?:\s+[a-z]+){0,1})\s+hu/i,
         /mera\s+([a-z]+(?:\s+[a-z]+){0,1})\s+ka\s+business/i,
         /main\s+([a-z]+(?:\s+[a-z]+){0,1})\s+hun/i,
         /i\s+am\s+([a-z]+(?:\s+[a-z]+){0,1})/i,
         /my\s+name\s+is\s+([a-z]+(?:\s+[a-z]+){0,1})/i,
         /([a-z]+(?:\s+[a-z]+){0,1})\s+(?:business|company|firm|shop|store)/i,
         /^(?!from|of|my|i|am|is|are|was|were|have|has|had|will|would|can|could|the|and|or|but)([a-z]+(?:\s+[a-z]+){0,1})\s+/i
       ];
      
      for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          if (!['am', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could'].includes(name.toLowerCase())) {
            return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          }
        }
      }
      
      const words = description.split(' ').filter(word => 
        word.length > 2 && 
        !['mai', 'main', 'mera', 'meri', 'hum', 'ham', 'i', 'am', 'is', 'are', 'the', 'and', 'or', 'but'].includes(word.toLowerCase())
      );
      
      return words.length > 0 ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Your Business';
    };
    
    const businessName = extractBusinessName(businessDescription);
    
         // Simple content generation - no hardcoded content
     const generateSmartContent = (description, name) => {
       return { subtitle: '' };
     };
    
    const smartContent = generateSmartContent(businessDescription, businessName);
    
    console.log('❌ OpenAI API not available - no fallback hero content');

    res.status(500).json({
      message: 'AI hero content generation failed - OpenAI API not available',
      error: 'Please ensure OpenAI API key is configured'
    });
  }
};

// Generate embeddings for business description analysis
const generateEmbeddingEndpoint = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user.userId;

    console.log('🔍 Embedding Generation Request:', {
      userId,
      text: text?.substring(0, 100) + '...'
    });

    if (!text || text.trim().length < 5) {
      return res.status(400).json({
        message: 'Text must be at least 5 characters long'
      });
    }

    // Generate embedding using text-embedding-3-large
    const embedding = await generateEmbedding(text);
    
    if (!embedding) {
      return res.status(500).json({
        message: 'Failed to generate embedding',
        error: 'Please try again or contact support'
      });
    }

    console.log('✅ Embedding Generated Successfully');

    res.json({
      message: 'Embedding generated successfully',
      embedding: embedding,
      model: 'text-embedding-3-large',
      dimensions: embedding.length
    });

  } catch (error) {
    console.error('Embedding Generation Error:', error);
    
    res.status(500).json({
      message: 'Embedding generation failed',
      error: 'Please ensure OpenAI API key is configured'
    });
  }
};

module.exports = {
  generateContent,
  generateHero,
  generateEmbeddingEndpoint
};
