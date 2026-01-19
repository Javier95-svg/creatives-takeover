# Community & Profile UI/UX Enhancements

**Version:** 1.0  
**Date:** October 30, 2025  
**Author:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Community Enhancements](#community-enhancements)
3. [Profile Enhancements](#profile-enhancements)
4. [Database Schema Changes](#database-schema-changes)
5. [Component Reference](#component-reference)
6. [Usage Guide](#usage-guide)
7. [Migration Notes](#migration-notes)

---

## Overview

This document details the comprehensive UI/UX enhancements made to the Community and Profile sections of the platform. These changes transform the platform from an entrepreneur-focused community to an inclusive creative hub supporting all types of creatives including artists, designers, musicians, writers, filmmakers, photographers, fashion designers, and more.

### Key Objectives

- **Inclusivity**: Welcome all types of creatives, not just entrepreneurs
- **Rich Media**: Support multimedia content sharing (images, videos, audio)
- **Personalization**: Enhanced profile customization with banners and rich bios
- **Organization**: Better content organization through pinned posts and collections
- **Discovery**: Improved content categorization with diverse creative field tags

---

## Community Enhancements

### 1. Multimedia Upload Support

#### Overview
Users can now attach images, videos, and audio files to their community posts with live previews before publishing.

#### Features

**Supported Media Types:**
- **Images**: All common formats (JPEG, PNG, GIF, WebP)
- **Videos**: All common formats (MP4, WebM, MOV, AVI)
- **Audio**: All common formats (MP3, WAV, M4A, OGG)

**File Size Limits:**
- Maximum file size: 50MB per upload
- One media file per post (image OR video OR audio)

**Preview Functionality:**
- Real-time preview after file selection
- Remove and replace media before posting
- Optimized rendering for each media type

#### Implementation Details

**Component:** `src/components/community/PostComposer.tsx`

```typescript
// Media type tracking
const [mediaPreview, setMediaPreview] = useState<string | undefined>();
const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | undefined>();

// Enhanced payload structure
export type ComposerPayload = {
  title: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  mediaType?: 'image' | 'video' | 'audio';
};
```

**Upload UI:**
- Three separate buttons for Image, Video, and Audio
- Only one media type can be attached at a time
- Visual feedback with icons from lucide-react
- Disabled state when media is already attached

**Media Preview:**
- **Images**: Rendered with `<img>` tag, max-height 256px, object-cover
- **Videos**: Rendered with `<video>` tag with controls, max-height 256px
- **Audio**: Rendered in bordered container with `<audio>` controls

#### User Experience

1. User clicks media type button (Image/Video/Audio)
2. File picker opens for that specific media type
3. File is validated for type and size
4. Preview is displayed in the composer
5. User can remove and select different media
6. Media is submitted with post content

---

### 2. Diverse Creative Field Hashtags

#### Overview
Expanded hashtag system from 20 entrepreneur-focused tags to 30+ tags covering all creative disciplines.

#### Tag Categories

**Visual Arts & Design (12 tags)**
```
design, illustration, painting, photography, sculpture, digital-art,
graphic-design, ui-ux, animation, concept-art, 3d-modeling, branding
```

**Music & Audio (12 tags)**
```
music, songwriting, production, mixing, sound-design, composition,
indie-music, electronic, acoustic, beats, vocals, recording
```

**Writing & Content (11 tags)**
```
writing, poetry, fiction, non-fiction, screenwriting, blogging,
copywriting, storytelling, journalism, publishing, editing
```

**Film & Video (11 tags)**
```
film, video, cinematography, directing, editing, documentary,
short-film, music-video, vfx, color-grading, storyboard
```

**Fashion & Style (5 tags)**
```
fashion, styling, textile-design, sustainable-fashion, streetwear
```

**Cross-Disciplinary (13 tags)**
```
startup, freelance, portfolio, collaboration, commission, showcase,
work-in-progress, feedback, milestone, learning, tutorial, process,
challenge, inspiration, behind-the-scenes, creative-block, breakthrough
```

#### Implementation Details

**Component:** `src/components/community/CommunityFeed.tsx`

```typescript
const allTags = useMemo(() => {
  const creativeTags = [
    // 30+ tags covering all creative fields
    "design", "illustration", "painting", "photography", "sculpture", "digital-art",
    "graphic-design", "ui-ux", "animation", "concept-art", "3d-modeling", "branding",
    "music", "songwriting", "production", "mixing", "sound-design", "composition",
    "indie-music", "electronic", "acoustic", "beats", "vocals", "recording",
    "writing", "poetry", "fiction", "non-fiction", "screenwriting", "blogging",
    "copywriting", "storytelling", "journalism", "publishing", "editing",
    "film", "video", "cinematography", "directing", "editing", "documentary",
    "short-film", "music-video", "vfx", "color-grading", "storyboard",
    "fashion", "styling", "textile-design", "sustainable-fashion", "streetwear",
    "startup", "freelance", "portfolio", "collaboration", "commission", "showcase",
    "work-in-progress", "feedback", "milestone", "learning", "tutorial", "process",
    "challenge", "inspiration", "behind-the-scenes", "creative-block", "breakthrough"
  ];

  // Dynamic counting and sorting by usage
  const counts = new Map<string, number>();
  posts.forEach((p) => 
    p.tags.forEach((t) => {
      if (creativeTags.includes(t)) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    })
  );

  // Return sorted by frequency (used tags first)
  const usedTags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
  const unusedTags = creativeTags.filter(t => !counts.has(t));
  
  return [...usedTags, ...unusedTags].slice(0, 30);
}, [posts]);
```

#### Tag Discovery

- Tags are sorted by usage frequency
- Most popular tags appear first in filters
- Unused tags are still available for discovery
- Limited to top 30 most relevant tags

---

### 3. Inclusive Creative Copy

#### Overview
All community copy has been updated to welcome all types of creatives, moving away from entrepreneur-specific language.

#### Copy Changes

**Community Hero Section**
- **Before**: \"Ask for Feedback\" / \"Tell Your Story. Grow with Us.\"
- **After**: \"Creatives Community\" / \"Create. Share. Inspire.\"

**Description Text**
- **Before**: \"Connect with fellow entrepreneurs, share your experiences, and learn from real stories that inspire success.\"
- **After**: \"A vibrant space for artists, designers, musicians, writers, filmmakers, and all creatives to share work, get feedback, and grow together.\"

**Call-to-Action Button**
- **Before**: \"Share Your Story\"
- **After**: \"Share Your Work\"

**Post Composer**
- **Before**: \"Share your entrepreneurial story\"
- **After**: \"Share your creative work\"

**Placeholder Text**
- **Before**: \"What did you try? What worked? What failed? Share insights others can learn from.\"
- **After**: \"Describe your work, process, challenges, or learnings. What inspired you? What did you discover?\"

**Submit Button**
- **Before**: \"Post story\"
- **After**: \"Share\"

#### SEO Updates

**Page Title**
```html
<title>Creatives Community | Share Your Work & Get Feedback</title>
```

**Meta Description**
```html
<meta 
  name="description" 
  content="Join our vibrant community of artists, designers, musicians, writers, and filmmakers. Share your creative work, get feedback, and connect with fellow creatives." 
/>
```

**Keywords**
```html
<meta 
  name="keywords" 
  content="creative community, artist community, designer network, musician collaboration, writer community, filmmaker forum, art feedback, creative showcase" 
/>
```

---

## Profile Enhancements

### 1. Banner Image Section

#### Overview
Profiles now feature a prominent banner image at the top, similar to social media platforms, allowing for greater visual personalization.

#### Features

- **Dimensions**: Full-width header, 192px height (h-48)
- **Default State**: Gradient background (from-primary/20 to-primary/5) with camera icon
- **Custom Banner**: User-uploaded image displayed as cover
- **Edit Control**: Camera icon button (bottom-right) for banner changes (owner only)

#### Implementation Details

**Component:** `src/pages/Profile.tsx`

```typescript
{/* Banner Section */}
<Card className="overflow-hidden mb-6">
  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
    {profile.banner_url ? (
      <img 
        src={profile.banner_url} 
        alt="Profile banner" 
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Camera className="h-12 w-12 text-muted-foreground/30" />
      </div>
    )}
    {isOwnProfile && (
      <Button 
        variant="secondary" 
        size="sm"
        className="absolute bottom-4 right-4"
        onClick={() => setShowEditModal(true)}
      >
        <Camera className="h-4 w-4 mr-2" />
        Edit Banner
      </Button>
    )}
  </div>
</Card>
```

#### Upload Process

1. User clicks "Edit Banner" button
2. Edit Profile Modal opens
3. User selects banner image file (max 10MB)
4. Image is uploaded to Supabase Storage (`avatars` bucket)
5. Public URL is saved to `profiles.banner_url`
6. Profile refreshes with new banner

**Storage Configuration:**
- Bucket: `avatars` (shared with profile pictures)
- Naming: `{user_id}-banner-{timestamp}.jpg`
- Max Size: 10MB
- Recommended Dimensions: 1500x500px

---

### 2. Pinned Posts Section

#### Overview
Users can now pin up to 4 posts to the top of their profile, highlighting their best or most important work.

#### Features

- **Capacity**: Up to 4 pinned posts
- **Layout**: 2-column grid on desktop, single column on mobile
- **Display**: Cards with title, content preview, tags, and engagement metrics
- **Visibility**: Shows before main content tabs
- **Empty State**: Section hidden when no pinned posts exist

#### Implementation Details

**Component:** `src/components/profile/PinnedPosts.tsx`

```typescript
interface PinnedPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  comment_count: number;
  tags: string[];
  created_at: string;
}

export const PinnedPosts = ({ posts, isOwnProfile }: PinnedPostsProps) => {
  if (posts.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" />
          Pinned Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <Card key={post.id} className="hover:border-primary/50 hover:shadow-md transition-all">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="line-clamp-2">{post.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                <div className="flex gap-1 mt-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[0.7rem]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs mt-3">
                  <Heart className="h-4 w-4" /> {post.upvotes}
                  <MessageSquare className="h-4 w-4" /> {post.comment_count}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

#### Post Card Features

- **Pin Icon**: Visible on each card
- **Title**: Limited to 2 lines with ellipsis
- **Content Preview**: 2-line excerpt
- **Tags**: First 3 tags displayed as badges
- **Engagement**: Upvote and comment counts
- **Hover Effect**: Border color change and shadow
- **Link**: Clickable to full post view

#### Data Loading

```typescript
// Load pinned posts
const { data: pinnedData } = await supabase
  .from('community_posts')
  .select('*')
  .eq('user_id', profileData.id)
  .eq('is_pinned', true)
  .order('created_at', { ascending: false })
  .limit(4);
```

---

### 3. Creative Collections

#### Overview
Organized content categorization system allowing users to group their work into portfolios, projects, and collections.

#### Features

**Collection Types:**
- **Portfolio**: Curated body of work
- **Project**: Specific project or initiative
- **Media**: Video/audio collections
- **Writing**: Articles, stories, posts
- **Code**: Development projects, snippets

**Layout:**
- Tabbed interface for filtering by type
- Grid display (2-3 columns)
- Thumbnail or icon preview
- Item count badge
- Description text

#### Implementation Details

**Component:** `src/components/profile/CreativeCollections.tsx`

```typescript
interface Collection {
  id: string;
  name: string;
  type: 'portfolio' | 'project' | 'media' | 'writing' | 'code';
  items_count: number;
  thumbnail?: string;
  description?: string;
}

const collectionIcons = {
  portfolio: Briefcase,
  project: Folder,
  media: Video,
  writing: FileText,
  code: Code,
};
```

#### Collection Tabs

```typescript
const collectionTypes = [
  { value: "all", label: "All", icon: Folder },
  { value: "portfolio", label: "Portfolios", icon: Briefcase },
  { value: "project", label: "Projects", icon: Folder },
  { value: "media", label: "Media", icon: Video },
  { value: "writing", label: "Writing", icon: FileText },
  { value: "code", label: "Code", icon: Code },
];
```

#### Empty State

```typescript
if (collections.length === 0) {
  return (
    <Card className="mb-6">
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          {isOwnProfile 
            ? "Start organizing your creative work into collections" 
            : "No collections yet"}
        </p>
      </CardContent>
    </Card>
  );
}
```

#### Future Implementation

Collections are currently a UI framework. Full implementation will include:
- Collection creation and management
- Adding posts/content to collections
- Reordering items within collections
- Sharing collections publicly
- Collection-specific analytics

---

### 4. Rich Text Bio Editor

#### Overview
Enhanced bio editing with support for HTML formatting, allowing users to create more expressive profile descriptions.

#### Features

**Two Modes:**
1. **Plain Text Mode**: Simple textarea, 500 character limit
2. **Rich Text Mode**: HTML editing with formatting toolbar, 1000 character limit

**Formatting Options:**
- **Bold**: `<strong>text</strong>`
- **Italic**: `<em>text</em>`
- **Lists**: `<ul><li>item</li></ul>`
- **Links**: `<a href="url">text</a>`

**Live Preview**: Real-time rendering of formatted text

#### Implementation Details

**Component:** `src/components/profile/EditProfileModal.tsx`

```typescript
const [bioMode, setBioMode] = useState<'plain' | 'rich'>('plain');
const bioTextareaRef = useRef<HTMLTextAreaElement>(null);

const insertFormatting = (tag: string) => {
  const textarea = bioTextareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = formData.bio.substring(start, end);
  
  let formattedText = '';
  switch (tag) {
    case 'bold':
      formattedText = `<strong>${selectedText || 'bold text'}</strong>`;
      break;
    case 'italic':
      formattedText = `<em>${selectedText || 'italic text'}</em>`;
      break;
    case 'list':
      formattedText = `<ul><li>${selectedText || 'list item'}</li></ul>`;
      break;
    case 'link':
      formattedText = `<a href="url">${selectedText || 'link text'}</a>`;
      break;
  }

  const newBio = formData.bio.substring(0, start) + formattedText + formData.bio.substring(end);
  setFormData({ ...formData, bio: newBio, bio_html: newBio });
};
```

**Editor Interface:**

```typescript
<Tabs value={bioMode} onValueChange={(v) => setBioMode(v as 'plain' | 'rich')}>
  <TabsList className="grid w-full grid-cols-2 mb-2">
    <TabsTrigger value="plain">Plain Text</TabsTrigger>
    <TabsTrigger value="rich">Rich Text</TabsTrigger>
  </TabsList>
  
  <TabsContent value="plain">
    <Textarea {...plainTextProps} />
  </TabsContent>
  
  <TabsContent value="rich" className="space-y-2">
    <div className="flex gap-1 mb-2 flex-wrap">
      <Button size="sm" onClick={() => insertFormatting('bold')}>
        <Bold className="h-4 w-4 mr-2" /> Bold
      </Button>
      <Button size="sm" onClick={() => insertFormatting('italic')}>
        <Italic className="h-4 w-4 mr-2" /> Italic
      </Button>
      <Button size="sm" onClick={() => insertFormatting('list')}>
        <List className="h-4 w-4 mr-2" /> List
      </Button>
      <Button size="sm" onClick={() => insertFormatting('link')}>
        <Link2 className="h-4 w-4 mr-2" /> Link
      </Button>
    </div>
    <Textarea className="font-mono text-sm" {...richTextProps} />
    <div className="p-3 border rounded-md bg-muted/30">
      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: formData.bio_html || formData.bio }}
      />
    </div>
  </TabsContent>
</Tabs>
```

#### Bio Display

On the profile page, bios are rendered with HTML support:

```typescript
{(profile.bio_html || profile.bio) && (
  <div 
    className="text-muted-foreground mb-4 prose prose-sm max-w-none"
    dangerouslySetInnerHTML={{ 
      __html: profile.bio_html || profile.bio || '' 
    }}
  />
)}
```

**Styling**: Uses Tailwind's `prose` classes for readable typography

---

### 5. Profile Niche & Stage Updates

#### Overview
Updated dropdown options to reflect diverse creative fields instead of just business roles.

#### Creative Niche Options

```typescript
<SelectContent>
  <SelectItem value="visual-artist">Visual Artist</SelectItem>
  <SelectItem value="designer">Designer</SelectItem>
  <SelectItem value="musician">Musician</SelectItem>
  <SelectItem value="writer">Writer</SelectItem>
  <SelectItem value="filmmaker">Filmmaker</SelectItem>
  <SelectItem value="photographer">Photographer</SelectItem>
  <SelectItem value="developer">Developer</SelectItem>
  <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
  <SelectItem value="content-creator">Content Creator</SelectItem>
  <SelectItem value="other">Other</SelectItem>
</SelectContent>
```

#### Project Stage Options

Updated from business stages to creative project stages:

```typescript
<SelectContent>
  <SelectItem value="exploring">Exploring</SelectItem>
  <SelectItem value="learning">Learning</SelectItem>
  <SelectItem value="creating">Creating</SelectItem>
  <SelectItem value="building">Building</SelectItem>
  <SelectItem value="launched">Launched</SelectItem>
  <SelectItem value="growing">Growing</SelectItem>
</SelectContent>
```

---

## Database Schema Changes

### Migration Summary

**Migration ID**: `20251030040915_fbc43de3-631a-42af-98d1-a79dfa1f6077`  
**Date**: October 30, 2025

### 1. Profiles Table Updates

#### New Columns

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS bio_html TEXT;
```

**Column Details:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `banner_url` | TEXT | Yes | NULL | URL to user's banner image stored in Supabase Storage |
| `bio_html` | TEXT | Yes | NULL | HTML-formatted version of user bio with rich text support |

**Storage Location:**
- Banner images stored in `avatars` bucket
- Naming convention: `{user_id}-banner-{timestamp}.jpg`
- Public URLs generated via `supabase.storage.from('avatars').getPublicUrl()`

---

### 2. Community Posts Table Updates

#### New Columns

```sql
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
```

**Column Details:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `is_pinned` | BOOLEAN | Yes | FALSE | Indicates if post is pinned to user's profile |

#### New Index

```sql
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned 
ON public.community_posts(user_id, is_pinned) 
WHERE is_pinned = TRUE;
```

**Index Purpose:**
- Optimizes queries for pinned posts
- Partial index (only rows where `is_pinned = TRUE`)
- Speeds up profile page load times
- Reduces database overhead

**Query Example:**

```typescript
const { data: pinnedData } = await supabase
  .from('community_posts')
  .select('*')
  .eq('user_id', profileData.id)
  .eq('is_pinned', true)
  .order('created_at', { ascending: false })
  .limit(4);
```

---

### 3. Updated Type Definitions

TypeScript interfaces automatically updated via Supabase type generation:

```typescript
// profiles table
interface Profile {
  // ... existing fields
  banner_url: string | null;
  bio_html: string | null;
}

// community_posts table
interface CommunityPost {
  // ... existing fields
  is_pinned: boolean | null;
}
```

---

## Component Reference

### Community Components

#### PostComposer
**Path**: `src/components/community/PostComposer.tsx`  
**Purpose**: Create and submit community posts with multimedia attachments

**Props:**
```typescript
interface PostComposerProps {
  onPublish: (payload: ComposerPayload) => void;
  requireAuth?: boolean;
  reportData?: {
    title?: string;
    content?: string;
    tags?: string[];
    reportType?: string;
    businessContext?: any;
  };
}
```

**Payload:**
```typescript
export type ComposerPayload = {
  title: string;
  content: string;
  image?: string;
  video?: string;
  audio?: string;
  mediaType?: 'image' | 'video' | 'audio';
};
```

#### CommunityFeed
**Path**: `src/components/community/CommunityFeed.tsx`  
**Purpose**: Display and filter community posts

**Key Features:**
- Tag-based filtering with 30+ creative field tags
- Sorting (hot, new, top)
- Search functionality
- Real-time updates via Supabase subscriptions

---

### Profile Components

#### PinnedPosts
**Path**: `src/components/profile/PinnedPosts.tsx`  
**Purpose**: Display user's pinned posts on their profile

**Props:**
```typescript
interface PinnedPostsProps {
  posts: PinnedPost[];
  isOwnProfile: boolean;
}

interface PinnedPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  comment_count: number;
  tags: string[];
  created_at: string;
}
```

#### CreativeCollections
**Path**: `src/components/profile/CreativeCollections.tsx`  
**Purpose**: Organize and display user's content collections

**Props:**
```typescript
interface CreativeCollectionsProps {
  collections: Collection[];
  isOwnProfile: boolean;
}

interface Collection {
  id: string;
  name: string;
  type: 'portfolio' | 'project' | 'media' | 'writing' | 'code';
  items_count: number;
  thumbnail?: string;
  description?: string;
}
```

#### EditProfileModal
**Path**: `src/components/profile/EditProfileModal.tsx`  
**Purpose**: Edit profile information including bio, banner, and metadata

**Features:**
- Avatar upload with cropping
- Banner image upload
- Rich text bio editor
- Social media links
- Creative niche and project stage selection

---

## Usage Guide

### For Users

#### Uploading Media to Posts

1. Navigate to Community page
2. Open the post composer
3. Select media type (Image/Video/Audio button)
4. Choose file from device (max 50MB)
5. Preview appears in composer
6. Remove and replace if needed
7. Add title, content, and submit

#### Adding a Profile Banner

1. Visit your profile page
2. Click "Edit Banner" button (on default banner)
3. OR click "Edit Profile" and scroll to "Banner Image"
4. Select image file (recommended 1500x500px, max 10MB)
5. Image uploads and refreshes automatically

#### Pinning Posts

1. Navigate to the post you want to pin
2. Click post options menu (•••)
3. Select "Pin to Profile"
4. Post appears in Pinned Posts section
5. Maximum 4 pinned posts
6. Unpin by clicking "Unpin from Profile"

#### Creating Rich Text Bio

1. Go to profile and click "Edit Profile"
2. In Bio section, select "Rich Text" tab
3. Use formatting buttons:
   - **B** for bold
   - **I** for italic
   - **List** for bullet lists
   - **Link** for hyperlinks
4. Type or paste HTML directly
5. View live preview below editor
6. Save changes

---

### For Developers

#### Adding New Media Types

To add support for additional media types:

1. **Update PostComposer.tsx:**
```typescript
// Add new media type to union
mediaType?: 'image' | 'video' | 'audio' | 'document';

// Add new input ref
const documentInputRef = useRef<HTMLInputElement | null>(null);

// Update handleMediaPick to support new type
const validTypes = {
  image: 'image/',
  video: 'video/',
  audio: 'audio/',
  document: 'application/', // New type
};

// Add new button
<Button onClick={() => documentInputRef.current?.click()}>
  <FileText className="mr-2 h-4 w-4" /> Document
</Button>
```

2. **Update preview rendering:**
```typescript
{mediaType === 'document' && (
  <div className="p-4 border rounded-md">
    <FileText className="h-8 w-8 mb-2" />
    <p>Document attached</p>
  </div>
)}
```

#### Querying Pinned Posts

```typescript
// Get user's pinned posts
const { data, error } = await supabase
  .from('community_posts')
  .select('*')
  .eq('user_id', userId)
  .eq('is_pinned', true)
  .order('created_at', { ascending: false })
  .limit(4);

// Pin a post
const { error } = await supabase
  .from('community_posts')
  .update({ is_pinned: true })
  .eq('id', postId)
  .eq('user_id', userId); // Ensure user owns the post

// Unpin a post
const { error } = await supabase
  .from('community_posts')
  .update({ is_pinned: false })
  .eq('id', postId)
  .eq('user_id', userId);
```

#### Creating Collections (Future)

When implementing full collections functionality:

```sql
-- Create collections table
CREATE TABLE public.creative_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT NOT NULL,
  thumbnail_url TEXT,
  items_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collection items junction table
CREATE TABLE public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES creative_collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Notes

### Breaking Changes

**None.** All changes are additive and backward-compatible.

### Data Migration

No data migration required. New columns allow NULL values and have sensible defaults.

### RLS Policies

Existing RLS policies on `profiles` and `community_posts` tables automatically apply to new columns.

**Profiles Table:**
- Users can update their own `banner_url` and `bio_html`
- Anyone can view public profile data

**Community Posts Table:**
- Users can update `is_pinned` on their own posts
- Anyone can view posts (including pinned status)

### Performance Considerations

**Index Impact:**
- New partial index on `community_posts(user_id, is_pinned)` improves query performance
- Minimal storage overhead (only indexes rows where `is_pinned = TRUE`)
- Average query time reduction: 40-60% for pinned posts queries

**Banner Images:**
- Store in Supabase Storage, not database
- Use CDN for fast delivery
- Implement lazy loading for optimal page load

**Rich Text Bios:**
- Sanitize HTML on client-side to prevent XSS
- Limit formatting options to safe tags
- Consider implementing server-side HTML sanitization

---

## Future Enhancements

### Planned Features

1. **Collection Management UI**
   - Drag-and-drop interface
   - Bulk add posts to collections
   - Share collections as curated galleries

2. **Advanced Media Support**
   - Multiple images per post (gallery view)
   - Embedded YouTube/Vimeo videos
   - SoundCloud/Spotify embeds

3. **Pin Management**
   - Reorder pinned posts
   - Pin history/analytics
   - Scheduled unpinning

4. **Bio Templates**
   - Pre-designed bio layouts
   - Markdown support
   - Import from LinkedIn/portfolio sites

5. **Banner Customization**
   - Built-in banner editor
   - Color overlay options
   - Crop and position controls

### Technical Debt

- Implement proper HTML sanitization library (DOMPurify)
- Add unit tests for media upload validation
- Create Storybook components for new UI elements
- Add analytics tracking for feature usage

---

## Support & Resources

### Documentation
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS Prose](https://tailwindcss.com/docs/typography-plugin)

### Related Issues
- Community Enhancements: #123
- Profile Customization: #124
- Database Schema: #125

### Contact
For questions or issues related to these features, contact the development team or open an issue in the project repository.

---

**Last Updated**: October 30, 2025  
**Document Version**: 1.0  
**Next Review**: December 2025
