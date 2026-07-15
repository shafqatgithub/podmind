# PodMind AI – Design System

Version: 1.0

Document: 05-Design-System.md

Status: Draft

---

# 1. Purpose

The PodMind AI Design System defines every visual component, spacing rule, color, typography, interaction, animation and reusable UI pattern used throughout the application.

Goals

- Consistent UI
- Faster Development
- Better User Experience
- Reusable Components
- Easy Maintenance

---

# 2. Design Principles

Every screen must be:

- Clean
- Premium
- Modern
- Minimal
- Fast
- Accessible
- Responsive
- AI First

---

# 3. Brand Personality

Professional

Intelligent

Modern

Friendly

Premium

Trustworthy

---

# 4. Theme

Primary Theme

Dark

Secondary Theme

Light

User can switch anytime.

---

# 5. Color Tokens

## Primary

Primary 50

Primary 100

Primary 200

Primary 300

Primary 400

Primary 500

Primary 600

Primary 700

Primary 800

Primary 900

---

## Success

Green Scale

50–900

---

## Warning

Yellow Scale

50–900

---

## Error

Red Scale

50–900

---

## Neutral

Gray Scale

50–950

---

# 6. Semantic Colors

Background

Surface

Card

Border

Input

Hover

Active

Disabled

Focus

Overlay

---

# 7. Typography

Font Family

Inter

Fallback

System Fonts

---

Display

64px

Bold

---

H1

48px

Bold

---

H2

36px

Bold

---

H3

30px

SemiBold

---

H4

24px

SemiBold

---

H5

20px

Medium

---

H6

18px

Medium

---

Body Large

18px

---

Body

16px

---

Small

14px

---

Caption

12px

---

# 8. Font Weight

Regular

Medium

SemiBold

Bold

ExtraBold

---

# 9. Border Radius

Small

8px

Medium

12px

Large

16px

XL

24px

Full

999px

---

# 10. Shadow System

Small

Medium

Large

XL

Glass Shadow

Floating Shadow

---

# 11. Spacing System

Base Unit

8px

Spacing Scale

4

8

12

16

20

24

32

40

48

64

80

96

128

---

# 12. Grid System

Desktop

12 Columns

Tablet

8 Columns

Mobile

4 Columns

---

# 13. Breakpoints

Mobile

0–640

Tablet

641–1024

Laptop

1025–1440

Desktop

1441+

Ultra Wide

1920+

---

# 14. Buttons

Variants

Primary

Secondary

Outline

Ghost

Danger

Success

AI Action

Icon Button

Sizes

Small

Medium

Large

XL

States

Default

Hover

Pressed

Disabled

Loading

Success

Error

---

# 15. Input Components

Text Input

Password

Textarea

Search

Dropdown

Combobox

Date Picker

Time Picker

Number Input

OTP

Color Picker

File Upload

URL Input

---

States

Default

Focused

Error

Disabled

Loading

Success

---

# 16. Cards

Standard Card

Analytics Card

Project Card

Research Card

Guest Card

AI Card

Pricing Card

Glass Card

Hover Card

---

# 17. Navigation

Top Navbar

Sidebar

Bottom Navigation

Breadcrumb

Tabs

Pagination

Command Palette

---

# 18. Tables

Sticky Header

Sorting

Filtering

Pagination

Search

Bulk Actions

Export

Column Resize

---

# 19. Modal Components

Dialog

Confirmation

Delete Modal

AI Loading Modal

Subscription Modal

Share Modal

Export Modal

---

# 20. Feedback Components

Toast

Success

Error

Warning

Info

Banner

Alert

Progress

Snackbar

---

# 21. AI Components

AI Prompt Box

AI Thinking Card

Streaming Response

Model Selector

Token Counter

Cost Indicator

AI Badge

AI Suggestions

AI Quick Actions

Conversation Panel

---

# 22. Dashboard Widgets

Statistics Card

Revenue Card

Credits Card

Activity Timeline

Recent Projects

Usage Graph

Quick Actions

Trending Topics

---

# 23. Loading Components

Skeleton Card

Skeleton Table

Skeleton Text

Progress Bar

AI Thinking Animation

Spinner

Pulse

---

# 24. Empty States

Projects

Research

Guests

Scripts

Notifications

Exports

Analytics

Every empty state should include:

Illustration

Message

Action Button

---

# 25. Icons

Library

Lucide

Rules

One icon style only.

No mixed icon libraries.

---

# 26. Images

Rounded Corners

Lazy Loading

Responsive

Optimized

Blur Placeholder

---

# 27. Charts

Area Chart

Line Chart

Bar Chart

Pie Chart

Donut Chart

Heatmap

All charts must support Dark Mode.

---

# 28. Motion System

Library

Framer Motion

Page Transition

300ms

Button Hover

150ms

Cards Hover

200ms

Sidebar

250ms

Modal

250ms

---

# 29. Micro Interactions

Button Ripple

Hover Lift

Copy Animation

AI Typing

Card Expansion

Tooltip Fade

---

# 30. Accessibility

Keyboard Navigation

ARIA Labels

High Contrast

Focus Ring

Screen Reader

Reduced Motion Support

---

# 31. Responsive Rules

Every component must support

Desktop

Laptop

Tablet

Mobile

Landscape

Portrait

---

# 32. Component Naming

PMButton

PMCard

PMInput

PMTable

PMBadge

PMModal

PMAvatar

PMChart

PMToast

PMLoader

---

# 33. Folder Structure

packages/ui/

button/

card/

input/

table/

modal/

chart/

avatar/

badge/

toast/

loader/

tabs/

tooltip/

dropdown/

dialog/

---

# 34. Design Tokens

colors.ts

spacing.ts

radius.ts

typography.ts

shadow.ts

animation.ts

breakpoints.ts

z-index.ts

opacity.ts

---

# 35. Quality Standards

Every component must have:

TypeScript

Accessibility

Dark Mode

Light Mode

Loading State

Disabled State

Error State

Storybook Story (Future)

Unit Test

Documentation

---

# 36. Future Components

Kanban Board

Calendar

Timeline

Mind Map

Rich Text Editor

AI Whiteboard

Workflow Builder

Voice Recorder

Command Center

AI Agent Panel

---

# 37. Acceptance Criteria

✓ Fully Responsive

✓ Reusable

✓ Accessible

✓ Enterprise Ready

✓ Dark Mode First

✓ Type Safe

✓ Performance Optimized

✓ AI First Experience

---

Next Document

06-API-Documentation.md
