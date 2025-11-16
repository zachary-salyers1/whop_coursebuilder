# Whop API Course Creation Process

## Current Implementation Overview

Our AI Course Builder app creates courses using Whop's Experiences API. Here's the complete step-by-step process:

---

## Step-by-Step API Course Creation Process

### 1. **Create Experience**
**Endpoint:** `POST /api/v1/experiences`

**Request Body:**
```json
{
  "company_id": "biz_1Io4EO2Twj9wo7",
  "name": "AI Automation Mastery for Small Businesses",
  "description": "Course description here"
}
```

**Response:**
```json
{
  "id": "exp_xqOZ2NZAk9l2oi",
  "name": "AI Automation Mastery for Small Businesses",
  "company": {...}
}
```

**Code Location:** `lib/services/whop-api-service.ts:44-62`

---

### 2. **Create Courses (Modules) within the Experience**
For each module in our course structure, we create a **Course** inside the Experience.

**Endpoint:** `POST /api/v1/courses`

**Request Body:**
```json
{
  "experience_id": "exp_xqOZ2NZAk9l2oi",
  "title": "Transform Your Marketing with AI",
  "tagline": "Discover how AI can enhance your marketing efforts"
}
```

**Response:**
```json
{
  "id": "cors_u1ytsequ3Bp6i",
  "title": "Transform Your Marketing with AI",
  "tagline": "Discover how AI can enhance your marketing efforts",
  "chapters": []
}
```

**Code Location:** `lib/services/whop-api-service.ts:64-87`

**Our Implementation:** We create **5 separate courses** (one for each module):
1. Harness the Power of AI for Customer Engagement
2. Transform Your Marketing with AI
3. Supercharge Sales with AI Automation
4. Streamline Operations with AI
5. Kickstart Your AI Automation Journey

---

### 3. **Create Chapters within each Course**
For each chapter in a module, we create a **Chapter** inside the Course.

**Endpoint:** `POST /api/v1/course_chapters`

**Request Body:**
```json
{
  "course_id": "cors_u1ytsequ3Bp6i",
  "title": "Create Content with AI Assistance",
  "order": 0
}
```

**Response:**
```json
{
  "id": "chap_uEZq1O1O0pYj3",
  "title": "Create Content with AI Assistance",
  "order": 0,
  "lessons": []
}
```

**Code Location:** `lib/services/whop-api-service.ts:89-113`

**Example:** For "Transform Your Marketing with AI" course, we create 3 chapters:
- Create Content with AI Assistance
- Optimize Marketing Campaigns with AI Insights
- Customize Customer Experience with AI

---

### 4. **Create Lessons within each Chapter**
For each lesson in a chapter, we create a **Lesson** inside the Chapter.

**Endpoint:** `POST /api/v1/course_lessons`

**Request Body:**
```json
{
  "chapter_id": "chap_uEZq1O1O0pYj3",
  "title": "Generate Blog Posts Using AI",
  "lesson_type": "text",
  "content": "Creating engaging content consistently is a challenge...",
  "order": 0
}
```

**Response:**
```json
{
  "id": "lesn_Ng2nkqtulPFz7",
  "title": "Generate Blog Posts Using AI",
  "lesson_type": "text",
  "content": "Creating engaging content consistently...",
  "order": 0
}
```

**Code Location:** `lib/services/whop-api-service.ts:115-154`

---

## Complete Hierarchy

```
Experience (exp_xqOZ2NZAk9l2oi)
└── Course 1: "Harness the Power of AI for Customer Engagement" (cors_DR6tqvBAZXHdG)
    ├── Chapter: "Implement Chatbots for 24/7 Support" (chap_y1WmFWUB0kXk5)
    │   └── Lesson: "Set Up Your First AI Chatbot" (lesn_xau8s302SnP0M)
    ├── Chapter: "Enhance Communication with AI-Driven Tools" (chap_wMTYTcMxbD24M)
    │   └── Lesson: "Automate Email Responses with AI" (lesn_xah1OhHFbNkkz)
    └── Chapter: "Analyze Customer Sentiment Effectively" (chap_DN9WeqWtnEnfB)
        └── Lesson: "Monitor Social Media with AI Sentiment Analysis" (lesn_m94HWIWZ6vZIM)

└── Course 2: "Transform Your Marketing with AI" (cors_u1ytsequ3Bp6i)
    ├── Chapter: "Create Content with AI Assistance" (chap_uEZq1O1O0pYj3)
    │   └── Lesson: "Generate Blog Posts Using AI" (lesn_Ng2nkqtulPFz7)
    ├── Chapter: "Optimize Marketing Campaigns with AI Insights" (chap_WfIyiZxaJCaH8)
    │   └── Lesson: "Track Campaign Performance with AI" (lesn_nhwE0qAxHHWM4)
    └── Chapter: "Customize Customer Experience with AI" (chap_C9OwAE6UKm2Kr)
        └── Lesson: "Personalize Email Campaigns with AI" (lesn_1LKGSZNP1xEKw)

└── Course 3: "Supercharge Sales with AI Automation" (cors_Z79VVm7aGlvVv)
    └── [3 chapters with 5 total lessons]

└── Course 4: "Streamline Operations with AI" (cors_FxrgK2v9h44LQ)
    └── [3 chapters with 6 total lessons]

└── Course 5: "Kickstart Your AI Automation Journey" (cors_PZmIgZUsaOuS0)
    └── [3 chapters with 3 total lessons]
```

**Total Count:**
- 1 Experience
- 5 Courses (modules)
- 13 Chapters
- 24 Lessons

---

## The Issue: Moving Modules to Whop Courses App

### What We're Seeing:
1. ✅ API successfully creates: 1 Experience → 5 Courses → 13 Chapters → 24 Lessons
2. ✅ Courses appear in Whop's Courses app as "13 modules from other courses"
3. ❌ When trying to "move" these modules into a Whop Courses app course, nothing happens
4. ❌ Clicking "Add" or trying to drag/drop the modules doesn't work

### What We're Trying to Do (That's Not Working):
We want to take these API-created courses/modules and add them to Whop's native Courses app so they can be:
- Managed through Whop's Courses interface
- Assigned to products
- Visible to members through the standard Courses app

### Questions for Whop Engineer:

1. **Can Experience-based courses be moved to Whop's native Courses app?**
   - Are courses created via the Experiences API compatible with the Courses app?
   - Is there a specific API endpoint or process to transfer/link them?

2. **Why create courses inside Experiences if they can't be used in Courses app?**
   - What's the intended use case for courses created within Experiences?
   - Should we be creating courses differently if we want them in the Courses app?

3. **What's the correct API approach?**
   - Should we create courses directly (not inside an Experience) if we want them in Courses app?
   - Is there a way to "publish" or "transfer" Experience courses to the Courses app?

4. **What are we seeing in the UI?**
   - Why do the 5 courses appear as "13 modules" in the Courses app?
   - Why can't we interact with them (move, add, etc.)?

---

## Alternative Approaches We've Considered:

### Option 1: Create Courses Without Experiences
Instead of creating an Experience first, create courses directly:
```
POST /api/v1/courses
{
  "company_id": "biz_1Io4EO2Twj9wo7",
  "title": "AI Automation Mastery for Small Businesses"
}
```

**Question:** Would this make courses appear properly in Courses app?

### Option 2: Use Different API Endpoints
Is there a different set of endpoints specifically for the Courses app vs. Experiences?

### Option 3: Manual Configuration
Is there a manual step in the Whop dashboard to "approve" or "link" API-created courses to the Courses app?

---

## Our Current Workaround

We built a custom course viewer in our app:
- URL: `/course/{experienceId}`
- Fetches course data from Whop API
- Displays all 5 modules, 13 chapters, and 24 lessons
- Users access it directly through our app, not through Whop's Courses app

**This works, but we'd prefer to use Whop's native Courses app if possible.**

---

## Code References

### Main Publishing Function
**File:** `lib/services/whop-api-service.ts`
**Method:** `publishCourse()`
**Lines:** 156-307

This function orchestrates the entire creation process:
1. Creates Experience
2. Loops through modules → creates Courses
3. Loops through chapters → creates Chapters
4. Loops through lessons → creates Lessons

### Database Mapping
After publishing, we save all Whop IDs to our database:
- `courseGenerations.whopExperienceId`
- `courseModules.whopCourseId`
- `courseChapters.whopChapterId`
- `courseLessons.whopLessonId`

**File:** `lib/services/course-generation-service.ts`
**Method:** `publishToWhop()`
**Lines:** 203-276

---

## NEW FINDINGS FROM WHOP DOCUMENTATION

After reviewing Whop's latest documentation (https://docs.whop.com/apps/guides/app-views), we discovered:

### Two Separate Course Systems

**1. Experience-Based Courses (API-Created)**
- **Created via:** `POST /api/v1/courses` with `experience_id` (REQUIRED parameter)
- **Retrieved via:** `listCoursesForExperience(experienceId)`
- **Appears in:** App's Experience View (sidebar)
- **Use case:** Custom course delivery apps (like ours)
- **Documentation quote:** Experience Views are "Ideal for interactive consumer-focused apps" including "Custom course delivery"

**2. Native Courses App (Manually Created)**
- **Created via:** Whop's Courses app interface (no API equivalent found)
- **Retrieved via:** `listCoursesForCompany(companyId)`
- **Appears in:** Whop's native Courses app
- **Use case:** Whop's built-in course management

### Why We Can't Move Courses to Whop's Native App

**The API requires `experience_id` when creating courses** - there's no way to create company-level courses via API. The two systems are fundamentally separate:

```
Experience-Based Courses ≠ Native Courses App Courses
```

### What We're Seeing in the UI

The "13 modules from other courses" are being detected by Whop's interface as external course content, but they **cannot be integrated** into the native Courses app because:
1. They belong to an Experience, not the company
2. They're associated with our app, not Whop's Courses app
3. The API architecture doesn't support transferring them

---

## Conclusion: Our Current Approach is Correct

According to Whop's documentation, **Experience Views are designed for "custom course delivery"** - which is exactly what we're building. The intended flow is:

1. ✅ Create Experience via API
2. ✅ Create Courses within that Experience via API
3. ✅ Users access courses through your app's Experience View
4. ✅ Use custom UI to display course content

**We should NOT try to move courses to Whop's native Courses app** - that's not how the architecture is designed.

---

## Updated Questions for Whop Engineer

1. **Is there a way to create company-level courses via API?**
   - Currently, `experience_id` is required for `POST /api/v1/courses`
   - Is there an API endpoint to create courses that appear in the native Courses app?

2. **What causes the "13 modules from other courses" UI behavior?**
   - Why do Experience-based courses appear in the Courses app interface if they can't be used there?
   - Should this UI be hidden for Experience-based courses?

3. **Should we continue using Experience Views for our course delivery app?**
   - Based on the documentation, this seems correct
   - Are there any limitations or best practices we should know about?

4. **Can Experience-based courses ever be converted to native Courses app courses?**
   - Is there a migration path or manual process?
   - Or are they permanently separate systems?

Thank you!
