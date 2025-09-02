import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const { title, description, category } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a focused prompt for generating a relevant business/tech image
    const prompt = `Create a modern, professional image representing: "${title}". 
    This is about ${category || 'business/technology'}. 
    ${description ? `Context: ${description.substring(0, 200)}` : ''}
    
    Style: Clean, modern, professional business illustration. Use a sophisticated color palette with blues, grays, and subtle accent colors. The image should be suitable for a business news article. Avoid text, people's faces, and overly complex details. Focus on abstract representations, icons, charts, technology symbols, or relevant business concepts.`;

    console.log('Generating image for article:', { title, category, prompt: prompt.substring(0, 100) + '...' });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp',
        background: 'opaque'
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to generate image');
    }

    const imageBase64 = data.data[0].b64_json;
    const imageUrl = `data:image/webp;base64,${imageBase64}`;

    console.log('Successfully generated image for article:', title);

    return new Response(
      JSON.stringify({ 
        imageUrl,
        title,
        success: true 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-article-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});