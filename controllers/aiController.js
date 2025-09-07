const axios = require('axios');

// Generate website content using OpenAI
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

    // OpenAI API call with enhanced prompt
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a world-class website content writer and marketing specialist. Generate professional, compelling, and conversion-focused website content based on the business description provided.

CRITICAL REQUIREMENTS:
1. Extract the business name intelligently from the description (avoid generic words like "business", "company")
2. Create a powerful, memorable tagline (max 8 words) that captures the essence
3. Generate an engaging hero title that converts visitors (decide whether to include "Welcome to" or not based on context)
4. Write a compelling hero subtitle (max 12 words) that creates urgency or highlights benefits
5. Create a detailed hero description (2-3 sentences) that builds trust and explains value proposition
6. Generate an appropriate about title that builds credibility
7. Write a comprehensive about description (3-4 sentences) that tells the story and builds trust

CONTENT GUIDELINES:
- Use professional, confident tone
- Focus on benefits, not just features
- Include credibility indicators where relevant
- Make it conversion-focused
- Avoid generic phrases
- Be specific and authentic
- Use power words that create emotional connection

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
      // Fallback content
      parsedContent = {
        tagline: `Welcome to ${businessDescription.split(' ')[0]}`,
        heroTitle: `Welcome to ${businessDescription.split(' ')[0]}`,
        heroSubtitle: 'Professional Solutions for Your Needs',
        heroDescription: businessDescription,
        aboutTitle: 'About Us',
        aboutDescription: businessDescription
      };
    }

    console.log('✅ AI Content Generated Successfully');

    res.json({
      message: 'Content generated successfully',
      content: parsedContent
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
       const text = description.toLowerCase();
       
       // Detect business type
       let businessType = 'business';
       let tagline = `${name} - Your Trusted Partner`;
       let subtitle = 'Professional Solutions for Your Needs';
       
       if (text.includes('poultry') || text.includes('feed') || text.includes('chicken') || text.includes('starter') || text.includes('finisher')) {
         businessType = 'poultry';
         tagline = `${name} - Premium Poultry Solutions`;
         subtitle = 'Quality Feed & Expert Care';
       } else if (text.includes('student') || text.includes('bca') || text.includes('portfolio') || text.includes('developer')) {
         businessType = 'portfolio';
         tagline = `${name} - Developer & Student`;
         subtitle = 'Building Tomorrow\'s Digital Solutions';
       } else if (text.includes('shop') || text.includes('store') || text.includes('retail')) {
         businessType = 'retail';
         tagline = `${name} - Your Shopping Destination`;
         subtitle = 'Quality Products & Great Service';
       } else if (text.includes('restaurant') || text.includes('food') || text.includes('cafe')) {
         businessType = 'food';
         tagline = `${name} - Delicious Food & Great Service`;
         subtitle = 'Taste the Difference';
       }
       
       return { businessType, tagline, subtitle };
     };
    
    const smartContent = generateSmartContent(businessDescription, businessName);
    
         // Enhanced fallback content when OpenAI API is not available
     const generateSmartFallback = (description, name) => {
       const text = description.toLowerCase();
       
       // Detect business type and generate appropriate content
       if (text.includes('doctor') || text.includes('mbbs') || text.includes('medical') || text.includes('surgeon') || text.includes('aiims')) {
         return {
           tagline: `${name} - Expert Medical Care`,
           heroTitle: `${name} - Professional Medical Services`,
           heroSubtitle: 'Trusted Healthcare from AIIMS Graduate',
           heroDescription: `As a qualified MBBS doctor from AIIMS Patna, I provide comprehensive medical care and surgical services. My expertise ensures the highest quality treatment for all patients.`,
           aboutTitle: `About Dr. ${name}`,
           aboutDescription: `Dr. ${name} is a qualified MBBS doctor with advanced training from AIIMS Patna. With years of medical experience, I am committed to providing exceptional healthcare services and surgical expertise to all patients.`
         };
       } else if (text.includes('poultry') || text.includes('feed') || text.includes('chicken')) {
         return {
           tagline: `${name} - Premium Poultry Solutions`,
           heroTitle: `${name} - Quality Poultry Feed`,
           heroSubtitle: 'Expert Nutrition for Healthy Growth',
           heroDescription: `We specialize in premium poultry feed solutions including starter, pre-starter, and finisher feeds. Our products ensure healthy growth and maximum productivity for your poultry business.`,
           aboutTitle: `About ${name}`,
           aboutDescription: `With years of experience in poultry nutrition, we provide high-quality feed products that meet the specific needs of different growth stages. Our commitment to quality ensures your poultry thrives.`
         };
       } else if (text.includes('student') || text.includes('bca') || text.includes('portfolio') || text.includes('developer')) {
         return {
           tagline: `${name} - Developer & Student`,
           heroTitle: `${name} - Digital Solutions`,
           heroSubtitle: 'Building Tomorrow\'s Technology',
           heroDescription: `I'm a passionate developer and student creating innovative digital solutions. With hands-on experience in various projects, I bring fresh ideas and technical expertise to every challenge.`,
           aboutTitle: `About ${name}`,
           aboutDescription: `As a BCA student with practical project experience, I combine academic knowledge with real-world application. I'm dedicated to continuous learning and delivering quality solutions.`
         };
       } else {
         return {
           tagline: `${name} - Your Trusted Partner`,
           heroTitle: `Welcome to ${name}`,
           heroSubtitle: 'Professional Solutions for Your Needs',
           heroDescription: `We provide exceptional services with years of experience and dedication to customer satisfaction. Our commitment to quality ensures the best results for all our clients.`,
           aboutTitle: `About ${name}`,
           aboutDescription: `We are dedicated to providing the best services to our customers with years of experience and expertise. Our team is committed to delivering excellence in everything we do.`
         };
       }
     };
     
     const fallbackContent = generateSmartFallback(businessDescription, businessName);

    console.log('✅ Using fallback content:', fallbackContent);

    res.json({
      message: 'Content generated successfully (fallback)',
      content: fallbackContent
    });
  }
};

// Generate hero section content specifically
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

    // OpenAI API call for hero content with enhanced prompt
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a world-class website content writer specializing in hero sections. Generate compelling, conversion-focused hero section content based on the business description provided.

CRITICAL REQUIREMENTS:
1. Extract the business name intelligently from the description (avoid generic words)
2. Create an engaging hero title that converts visitors (decide whether to include "Welcome to" or not based on context)
3. Write a compelling hero subtitle (max 12 words) that creates urgency or highlights key benefits
4. Create a detailed hero description (2-3 sentences) that builds trust and explains value proposition

CONTENT GUIDELINES:
- Use professional, confident tone
- Focus on benefits and outcomes
- Include credibility indicators where relevant
- Make it conversion-focused
- Avoid generic phrases
- Be specific and authentic
- Use power words that create emotional connection

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
      // Fallback content
      parsedContent = {
        title: `Welcome to ${businessDescription.split(' ')[0]}`,
        subtitle: 'Professional Solutions for Your Needs',
        description: businessDescription
      };
    }

    console.log('✅ AI Hero Content Generated Successfully');

    res.json({
      message: 'Hero content generated successfully',
      content: parsedContent
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
    
         // Smart content generation based on business type
     const generateSmartContent = (description, name) => {
       const text = description.toLowerCase();
       
       let subtitle = 'Professional Solutions for Your Needs';
       
       if (text.includes('poultry') || text.includes('feed') || text.includes('chicken') || text.includes('starter') || text.includes('finisher')) {
         subtitle = 'Quality Feed & Expert Care';
       } else if (text.includes('student') || text.includes('bca') || text.includes('portfolio') || text.includes('developer')) {
         subtitle = 'Building Tomorrow\'s Digital Solutions';
       } else if (text.includes('shop') || text.includes('store') || text.includes('retail')) {
         subtitle = 'Quality Products & Great Service';
       } else if (text.includes('restaurant') || text.includes('food') || text.includes('cafe')) {
         subtitle = 'Taste the Difference';
       }
       
       return { subtitle };
     };
    
    const smartContent = generateSmartContent(businessDescription, businessName);
    
         // Enhanced fallback content when OpenAI API is not available
     const generateSmartHeroFallback = (description, name) => {
       const text = description.toLowerCase();
       
       // Detect business type and generate appropriate content
       if (text.includes('doctor') || text.includes('mbbs') || text.includes('medical') || text.includes('surgeon') || text.includes('aiims')) {
         return {
           title: `${name} - Professional Medical Services`,
           subtitle: 'Trusted Healthcare from AIIMS Graduate',
           description: `As a qualified MBBS doctor from AIIMS Patna, I provide comprehensive medical care and surgical services. My expertise ensures the highest quality treatment for all patients.`
         };
       } else if (text.includes('poultry') || text.includes('feed') || text.includes('chicken')) {
         return {
           title: `${name} - Quality Poultry Feed`,
           subtitle: 'Expert Nutrition for Healthy Growth',
           description: `We specialize in premium poultry feed solutions including starter, pre-starter, and finisher feeds. Our products ensure healthy growth and maximum productivity for your poultry business.`
         };
       } else if (text.includes('student') || text.includes('bca') || text.includes('portfolio') || text.includes('developer')) {
         return {
           title: `${name} - Digital Solutions`,
           subtitle: 'Building Tomorrow\'s Technology',
           description: `I'm a passionate developer and student creating innovative digital solutions. With hands-on experience in various projects, I bring fresh ideas and technical expertise to every challenge.`
         };
       } else {
         return {
           title: `Welcome to ${name}`,
           subtitle: 'Professional Solutions for Your Needs',
           description: `We provide exceptional services with years of experience and dedication to customer satisfaction. Our commitment to quality ensures the best results for all our clients.`
         };
       }
     };
     
     const fallbackContent = generateSmartHeroFallback(businessDescription, businessName);

    console.log('✅ Using fallback hero content:', fallbackContent);

    res.json({
      message: 'Hero content generated successfully (fallback)',
      content: fallbackContent
    });
  }
};

module.exports = {
  generateContent,
  generateHero
};
