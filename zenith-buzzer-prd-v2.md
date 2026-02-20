# 📘 Product Requirements Document (PRD)

# Zenith Buzzer – Offline Quiz Buzzer System

Version: 2.0

---

# 1. 📌 Product Overview

## 1.1 Product Name

**Zenith Buzzer**

## 1.2 Purpose

Zenith Buzzer is a locally hosted real-time quiz buzzer system that allows a quiz master to run buzzer rounds without internet access.
The desktop application automatically hosts the server, admin panel, and player interface.
Participants join using mobile browsers over the same WiFi network.

## 1.3 Product Vision

To create the simplest and most reliable offline buzzer system for schools, colleges, quiz competitions, and live events — requiring zero technical setup from the admin.

---

# 2. 🎯 Objectives

* Plug-and-play desktop application
* No technical setup required
* Fully offline operation
* Accurate real-time buzzer ranking
* Quick onboarding using QR or link
* Clear team identification for every buzz
* Simple, projection-friendly admin UI

---

# 3. 👥 User Roles

## 3.1 Admin (Quiz Master)

* Installs the application (.exe)
* Opens the app to host session
* Shares join link / QR
* Monitors players
* Controls buzzer rounds
* Views rankings and timers

## 3.2 Players (Participants)

* Join using browser on phone/laptop
* Enter **team name before playing**
* Press buzzer during round
* See their ranking after pressing

---

# 4. 🖥️ Platform Scope

## 4.1 Admin Application

* Desktop app built with Electron
* Distributed as Windows installer (.exe)
* Hosts:

  * Local server
  * Admin dashboard
  * Player web interface

## 4.2 Player Interface

* Browser-based web page
* Hosted locally by Electron app
* Works on Android, iPhone, tablet, laptop

## 4.3 Network Scope

* Local WiFi only
* No internet required

---

# 5. 🔑 Core Features

---

# 5.1 Automatic Local Hosting

When admin launches the app:

* Server starts automatically
* Admin panel opens automatically
* Local IP detected automatically
* Join link displayed automatically
* QR generated automatically

Admin performs no technical setup.

---

# 5.2 Join Link Display

Admin panel must show:

```
http://192.168.x.x:3000
```

### Required Controls

* Copy link button
* Refresh link button (if network changes)
* Large visible format for projection

---

# 5.3 QR Code Joining

System must:

* Generate QR from join URL
* Display in admin panel
* Support projection on screen
* Allow one-click regenerate

Purpose: players scan and join instantly.

---

# 5.4 Team Name Join Requirement (MANDATORY)

## Description

Players **must enter a team name before accessing the buzzer**.

This ensures:

* Every buzz tied to a team
* Admin can identify presses instantly
* Accurate result exports
* Duplicate press prevention

---

## Join Flow

1. Player opens link
2. Join screen appears
3. Player enters team name
4. System validates name
5. Player enters buzzer screen

---

## Validation Rules

* Required field
* Trim whitespace
* Max 30 characters
* No duplicates allowed
* Server enforces uniqueness

---

## Error Handling

* Show error if empty name
* Show error if duplicate name
* Allow retry without reload

---

# 5.5 Player Join List

Admin must see live list of connected teams.

### Each record shows:

* Team name
* Join order
* Online/offline status
* Whether they already buzzed

### Admin Controls

* Remove team
* Lock join list
* Clear list

---

# 5.6 Buzzer Round Control

Admin panel must include:

* Open Buzzer
* Close Buzzer
* Reset Round
* Next Round

### System Behavior

* Only presses during open state count
* Duplicate presses ignored
* Late presses blocked
* Order stored instantly

---

# 5.7 Real-Time Ranking System

System must:

* Assign rank based on press order
* Show ranking instantly on admin panel
* Show rank immediately to player
* Lock order when round closes

### Display Example

1. Team Alpha
2. Team Beta
3. Team Gamma

---

# 5.8 Round Timer

Admin must be able to:

* Set round duration
* Start countdown timer
* Auto-close buzzer when timer ends
* Show countdown on screen
* Play alert when timer finishes

### Modes

* Manual open/close
* Auto timer mode
* Sudden death mode (future)

---

# 5.9 Sound Feedback System

Optional sounds:

* Round start sound
* First buzz sound
* Every buzz sound
* Timer end sound

Admin can toggle sounds on/off.

---

# 5.10 Player Interface Requirements

## Join Screen

* Team name input
* Join button
* Error display
* Clean mobile layout

## Buzzer Screen

* Large buzzer button
* Team name shown
* Status indicator
* Rank shown after buzz
* Button disabled after press

---

# 5.11 Session & Round Management

System must track:

* Current round number
* Results per round
* Winner history
* Option to export results

### Export Options

* CSV file
* JSON file

---

# 6. 🎨 UX Requirements

## Admin UI

* Large readable buttons
* Projection-friendly layout
* Clear status indicators
* Minimal text clutter

## Player UI

* Extremely simple
* Large buzzer button
* Fast response
* Works on low-end phones

---

# 7. ⚙️ Non-Functional Requirements

## Performance

* Ranking latency under 100ms on LAN
* Support 100+ players
* Instant WebSocket updates

## Reliability

* Must work offline
* Handle WiFi reconnection
* Prevent duplicate buzzes

## Security

* Local network only
* No external APIs
* No internet dependency

---

# 8. 📦 Installation & Deployment

## Admin Flow

1. Install Zenith Buzzer setup file
2. Launch app
3. Admin panel opens automatically
4. Join link + QR displayed automatically
5. Players connect
6. Quiz starts

No commands, no configuration.

---

# 9. 🔮 Future Enhancements

* Multi-room sessions
* Score tracking system
* Hardware buzzer integration
* Android admin version
* Tournament mode
* Leaderboard view
* Cloud sync option

---

# 10. ✅ Success Metrics

* Admin can start session in under 1 minute
* Players join within 10 seconds via QR
* Zero ranking errors during session
* Stable performance with 100+ players
* Positive usability feedback from non-technical hosts

---

# 📌 End of Document

**Zenith Buzzer – PRD v2.0**
