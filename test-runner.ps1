# Test runner - exercises every API module with happy + edge paths.
# Records pass/fail to test-results.txt for inspection.

$ErrorActionPreference = 'Continue'
$base = 'http://localhost:3000/api'
$results = @()
$pass = 0
$fail = 0

function Test-Step {
  param([string]$name, [scriptblock]$body)
  try {
    $r = & $body
    if ($r -eq $false) { throw 'returned false' }
    Write-Host "  PASS  $name" -ForegroundColor Green
    $script:pass++
    $script:results += "PASS  | $name"
  } catch {
    Write-Host "  FAIL  $name -> $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
    $script:results += "FAIL  | $name -> $($_.Exception.Message)"
  }
}

function Expect-Status {
  param([scriptblock]$call, [int]$wantStatus)
  try {
    & $call | Out-Null
    if ($wantStatus -eq 200 -or $wantStatus -eq 201) { return $true }
    throw "expected $wantStatus but got 2xx"
  } catch {
    $got = $_.Exception.Response.StatusCode.value__
    if ($got -eq $wantStatus) { return $true }
    throw "expected $wantStatus but got $got ($($_.Exception.Message))"
  }
}

function MakeHeaders {
  param([string]$token)
  return @{ 'Authorization' = "Bearer $token"; 'Content-Type' = 'application/json' }
}

# ===========================
# 1. AUTH
# ===========================
Write-Host "`n--- AUTH ---" -ForegroundColor Cyan

$rand = Get-Random -Maximum 999999
$email = "test${rand}@test.local"
$reg = $null
$me = $null

Test-Step "Register new user (valid)" {
  $body = @{ email=$email; username="tester$rand"; password="testpass123"; displayName="Tester" } | ConvertTo-Json
  $script:reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -Body $body -ContentType 'application/json'
  if (-not $reg.accessToken) { throw 'no accessToken' }
  if (-not $reg.refreshToken) { throw 'no refreshToken' }
  $true
}

Test-Step "Register with duplicate email returns 409/400" {
  $body = @{ email=$email; username="other$rand"; password="testpass123" } | ConvertTo-Json
  Expect-Status -wantStatus 409 -call { Invoke-RestMethod -Method Post -Uri "$base/auth/register" -Body $body -ContentType 'application/json' }
}

Test-Step "Register with short password returns 400" {
  $body = @{ email="another$rand@test.local"; username="x$rand"; password="ab" } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Post -Uri "$base/auth/register" -Body $body -ContentType 'application/json' }
}

Test-Step "Login with correct creds returns tokens" {
  $body = @{ email=$email; password="testpass123" } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body $body -ContentType 'application/json'
  if (-not $r.accessToken) { throw 'no accessToken' }
  $true
}

Test-Step "Login with wrong password returns 401" {
  $body = @{ email=$email; password="wrongpass" } | ConvertTo-Json
  Expect-Status -wantStatus 401 -call { Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body $body -ContentType 'application/json' }
}

Test-Step "GET /auth/me without token returns 401" {
  Expect-Status -wantStatus 401 -call { Invoke-RestMethod -Method Get -Uri "$base/auth/me" }
}

Test-Step "GET /auth/me with valid token returns user" {
  $script:me = Invoke-RestMethod -Method Get -Uri "$base/auth/me" -Headers (MakeHeaders $reg.accessToken)
  if ($me.email -ne $email) { throw "email mismatch" }
  $true
}

Test-Step "POST /auth/refresh issues new tokens" {
  # Need a FRESH refresh token because the prior login overwrote the one from register.
  $loginBody = @{ email=$email; password="testpass123" } | ConvertTo-Json
  $login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body $loginBody -ContentType 'application/json'
  $body = @{ refreshToken=$login.refreshToken } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/auth/refresh" -Body $body -ContentType 'application/json'
  if (-not $r.accessToken) { throw 'no accessToken' }
  $script:reg = $login  # use freshest tokens for subsequent tests
  $true
}

$token = $reg.accessToken
$hdr = MakeHeaders $token

# ===========================
# 2. CATEGORIES
# ===========================
Write-Host "`n--- CATEGORIES ---" -ForegroundColor Cyan

$cat = $null
Test-Step "Create category (valid)" {
  $body = @{ name='Work'; color='#3b82f6' } | ConvertTo-Json
  $script:cat = Invoke-RestMethod -Method Post -Uri "$base/categories" -Body $body -Headers $hdr
  if (-not $cat.id) { throw 'no id' }
  $true
}

Test-Step "Create category with no name returns 400" {
  $body = @{ color='#3b82f6' } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Post -Uri "$base/categories" -Body $body -Headers $hdr }
}

Test-Step "List categories returns the new one" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/categories" -Headers $hdr
  if (-not ($r | Where-Object { $_.id -eq $cat.id })) { throw 'not in list' }
  $true
}

Test-Step "Update category (valid)" {
  $body = @{ name='Work Updated' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Patch -Uri "$base/categories/$($cat.id)" -Body $body -Headers $hdr
  if ($r.name -ne 'Work Updated') { throw "name didn't change" }
  $true
}

# ===========================
# 3. TASKS (My Plans)
# ===========================
Write-Host "`n--- TASKS ---" -ForegroundColor Cyan

$task = $null
Test-Step "Create task (valid)" {
  $body = @{ title='Test task'; type='task'; priority='HIGH'; dueDate='2026-06-15T00:00:00.000Z'; startTime='09:00'; endTime='10:00'; categoryId=$cat.id } | ConvertTo-Json
  $script:task = Invoke-RestMethod -Method Post -Uri "$base/tasks" -Body $body -Headers $hdr
  if (-not $task.id) { throw 'no id' }
  $true
}

Test-Step "Create trip task with endDate" {
  $body = @{ title='Mumbai trip'; type='trip'; dueDate='2026-06-20T00:00:00.000Z'; endDate='2026-06-22T00:00:00.000Z' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/tasks" -Body $body -Headers $hdr
  if ($r.type -ne 'trip') { throw "type wrong" }
  $true
}

Test-Step "Create task without title returns 400" {
  $body = @{ type='task' } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Post -Uri "$base/tasks" -Body $body -Headers $hdr }
}

Test-Step "List tasks" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/tasks" -Headers $hdr
  if ($r.Count -lt 2) { throw "expected >=2, got $($r.Count)" }
  $true
}

Test-Step "Get task by id" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/tasks/$($task.id)" -Headers $hdr
  if ($r.id -ne $task.id) { throw "id mismatch" }
  $true
}

Test-Step "Update task status to DONE sets completedAt" {
  $body = @{ status='DONE' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Patch -Uri "$base/tasks/$($task.id)" -Body $body -Headers $hdr
  if ($r.status -ne 'DONE') { throw "status didn't change" }
  if (-not $r.completedAt) { throw "completedAt not set" }
  $true
}

Test-Step "Filter tasks by status=DONE" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/tasks?status=DONE" -Headers $hdr
  if ($r.Count -lt 1) { throw "no DONE tasks" }
  $true
}

Test-Step "GET /tasks/today returns array" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/tasks/today" -Headers $hdr
  if ($null -eq $r) { throw "null response" }
  $true
}

# ===========================
# 4. GOALS + milestones + minigoals
# ===========================
Write-Host "`n--- GOALS ---" -ForegroundColor Cyan

$goal = $null
$milestone = $null

Test-Step "Create goal (valid)" {
  $body = @{ title='Learn Rust'; description='Read the book'; status='ACTIVE'; resources=@('https://doc.rust-lang.org') } | ConvertTo-Json
  $script:goal = Invoke-RestMethod -Method Post -Uri "$base/goals" -Body $body -Headers $hdr
  if (-not $goal.id) { throw 'no id' }
  if ($goal.progress -ne 0) { throw "progress should be 0, got $($goal.progress)" }
  $true
}

Test-Step "Add milestone to goal" {
  $body = @{ title='Chapter 1' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/goals/$($goal.id)/milestones" -Body $body -Headers $hdr
  if ($r.milestones.Count -lt 1) { throw 'no milestones returned' }
  $script:milestone = $r.milestones[0]
  $true
}

Test-Step "Complete milestone bumps goal progress" {
  $r = Invoke-RestMethod -Method Patch -Uri "$base/goals/$($goal.id)/milestones/$($milestone.id)/complete" -Headers $hdr -Body '{}'
  if ($r.progress -ne 100) { throw "progress should be 100, got $($r.progress)" }
  $true
}

Test-Step "Add mini-goal" {
  $body = @{ title='Read intro' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/goals/$($goal.id)/milestones/$($milestone.id)/minigoals" -Body $body -Headers $hdr
  if ($r.milestones[0].miniGoals.Count -lt 1) { throw 'no mini-goals' }
  $true
}

# ===========================
# 5. HABITS
# ===========================
Write-Host "`n--- HABITS ---" -ForegroundColor Cyan

$habit = $null
Test-Step "Create habit (Mon-Fri Wakeup)" {
  $body = @{ title='Wakeup'; weekdays=@(1,2,3,4,5); startTime='07:00'; endTime='07:30'; icon='S'; color='#10b981' } | ConvertTo-Json
  $script:habit = Invoke-RestMethod -Method Post -Uri "$base/habits" -Body $body -Headers $hdr
  if (-not $habit.id) { throw 'no id' }
  $true
}

Test-Step "Create habit with invalid weekday returns 400" {
  $body = @{ title='Bad'; weekdays=@(8) } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Post -Uri "$base/habits" -Body $body -Headers $hdr }
}

Test-Step "Create habit with bad startTime returns 400" {
  $body = @{ title='Bad'; startTime='25:99' } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Post -Uri "$base/habits" -Body $body -Headers $hdr }
}

Test-Step "List habits with today param returns enriched fields" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $r = Invoke-RestMethod -Method Get -Uri "$base/habits?today=$today" -Headers $hdr
  $h = $r | Where-Object { $_.id -eq $habit.id }
  if (-not $h) { throw 'habit not in list' }
  if ($null -eq $h.streak) { throw 'no streak field' }
  if (-not $h.history) { throw 'no history' }
  if ($h.history.Count -ne 30) { throw "history should be 30 days, got $($h.history.Count)" }
  $true
}

Test-Step "Toggle today check-in increments streak" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $r = Invoke-RestMethod -Method Post -Uri "$base/habits/$($habit.id)/checkin?today=$today" -Headers $hdr -Body '{}'
  if (-not $r.doneToday) { throw 'doneToday false after check-in' }
  if ($r.scheduledToday -and $r.streak -lt 1) { throw "expected streak >= 1 on a scheduled day" }
  $true
}

Test-Step "Toggle today check-in again removes it" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $r = Invoke-RestMethod -Method Post -Uri "$base/habits/$($habit.id)/checkin?today=$today" -Headers $hdr -Body '{}'
  if ($r.doneToday) { throw 'doneToday still true' }
  $true
}

Test-Step "Trip plan covering today causes isOffToday=true" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $body = @{ title='Today trip'; type='trip'; dueDate="${today}T00:00:00.000Z"; endDate="${today}T00:00:00.000Z" } | ConvertTo-Json
  $tripPlan = Invoke-RestMethod -Method Post -Uri "$base/tasks" -Body $body -Headers $hdr
  $r = Invoke-RestMethod -Method Get -Uri "$base/habits?today=$today" -Headers $hdr
  $h = $r | Where-Object { $_.id -eq $habit.id }
  $isOff = $h.isOffToday
  # Cleanup
  Invoke-RestMethod -Method Delete -Uri "$base/tasks/$($tripPlan.id)" -Headers $hdr | Out-Null
  if (-not $isOff) { throw "isOffToday not true after trip plan; got $isOff" }
  $true
}

# ===========================
# 6. JOURNAL
# ===========================
Write-Host "`n--- JOURNAL ---" -ForegroundColor Cyan

Test-Step "Upsert today's journal entry" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $body = @{ body='Today I did things.'; mood='good'; title='Day 1' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Put -Uri "$base/journal/$today" -Body $body -Headers $hdr
  if ($r.body -ne 'Today I did things.') { throw "body mismatch" }
  $true
}

Test-Step "Upsert with empty body returns 400" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $body = @{ } | ConvertTo-Json
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Put -Uri "$base/journal/$today" -Body $body -Headers $hdr }
}

Test-Step "Update existing entry (same date)" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $body = @{ body='Updated body'; mood='ok' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Put -Uri "$base/journal/$today" -Body $body -Headers $hdr
  if ($r.body -ne 'Updated body') { throw "didn't update" }
  if ($r.mood -ne 'ok') { throw "mood didn't update" }
  $true
}

Test-Step "GET journal entry by date returns the record" {
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $r = Invoke-RestMethod -Method Get -Uri "$base/journal/$today" -Headers $hdr
  if ($r.body -ne 'Updated body') { throw 'wrong body' }
  $true
}

Test-Step "GET journal/<unknown date> returns null" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/journal/2020-01-01" -Headers $hdr
  if ($null -ne $r -and $r -ne "") { throw "expected null/empty, got something" }
  $true
}

Test-Step "Invalid date format in PUT returns 400/404" {
  $body = @{ body='hi' } | ConvertTo-Json
  Expect-Status -wantStatus 404 -call { Invoke-RestMethod -Method Put -Uri "$base/journal/not-a-date" -Body $body -Headers $hdr }
}

# ===========================
# 7. PROJECTS (with payments + self project)
# ===========================
Write-Host "`n--- PROJECTS ---" -ForegroundColor Cyan

$project = $null
$selfProject = $null

Test-Step "Create client project" {
  $body = @{ title='Logo for X'; clientName='X Co'; status='IN_PROGRESS'; quotedAmount=50000; currency='INR'; paymentStatus='PENDING'; deadline='2026-07-01' } | ConvertTo-Json
  $script:project = Invoke-RestMethod -Method Post -Uri "$base/projects" -Body $body -Headers $hdr
  if ($project.isSelf -ne $false) { throw "isSelf should be false" }
  if ($project.paymentStatus -ne 'PENDING') { throw "paymentStatus wrong" }
  $true
}

Test-Step "Create self project - clears client/payment fields" {
  $body = @{ title='Personal blog'; isSelf=$true; clientName='Should be wiped'; quotedAmount=99999; status='IN_PROGRESS' } | ConvertTo-Json
  $script:selfProject = Invoke-RestMethod -Method Post -Uri "$base/projects" -Body $body -Headers $hdr
  if ($selfProject.isSelf -ne $true) { throw "isSelf not true" }
  if ($selfProject.clientName) { throw "clientName not cleared: $($selfProject.clientName)" }
  if ($null -ne $selfProject.quotedAmount) { throw "quotedAmount not cleared: $($selfProject.quotedAmount)" }
  if ($selfProject.paymentStatus -ne 'NOT_APPLICABLE') { throw "paymentStatus wrong: $($selfProject.paymentStatus)" }
  $true
}

Test-Step "Record payment on client project" {
  $body = @{ amount=15000; date='2026-06-01'; note='Advance'; method='UPI' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Post -Uri "$base/projects/$($project.id)/payments" -Body $body -Headers $hdr
  if ($r.totalReceived -ne 15000) { throw "totalReceived wrong: $($r.totalReceived)" }
  if ($r.balance -ne 35000) { throw "balance wrong: $($r.balance)" }
  $true
}

Test-Step "Recording payment on SELF project returns 403" {
  $body = @{ amount=100; date='2026-06-01' } | ConvertTo-Json
  Expect-Status -wantStatus 403 -call { Invoke-RestMethod -Method Post -Uri "$base/projects/$($selfProject.id)/payments" -Body $body -Headers $hdr }
}

Test-Step "Update project to DELIVERED stamps deliveredAt" {
  $body = @{ status='DELIVERED' } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Patch -Uri "$base/projects/$($project.id)" -Body $body -Headers $hdr
  if ($r.status -ne 'DELIVERED') { throw "status not changed" }
  if (-not $r.deliveredAt) { throw "deliveredAt not stamped" }
  $true
}

Test-Step "Update with undefined fields does NOT crash" {
  # Regression test for "values argument contains undefined" Firebase error
  $body = @{ progress=50 } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Patch -Uri "$base/projects/$($project.id)" -Body $body -Headers $hdr
  if ($r.progress -ne 50) { throw "progress not updated" }
  $true
}

Test-Step "Update isSelf to true clears client and payment fields" {
  $body = @{ isSelf=$true } | ConvertTo-Json
  $r = Invoke-RestMethod -Method Patch -Uri "$base/projects/$($project.id)" -Body $body -Headers $hdr
  if ($r.clientName) { throw "clientName not cleared" }
  if ($r.paymentStatus -ne 'NOT_APPLICABLE') { throw "paymentStatus wrong" }
  $true
}

# ===========================
# 9. ANALYTICS
# ===========================
Write-Host "`n--- ANALYTICS ---" -ForegroundColor Cyan

Test-Step "Analytics summary 30d returns full payload" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/analytics/summary?range=30d" -Headers $hdr
  if (-not $r.tasks) { throw "no tasks block" }
  if (-not $r.habits) { throw "no habits block" }
  if (-not $r.focus) { throw "no focus block" }
  if (-not $r.dailyActivity -or $r.dailyActivity.Count -ne 30) { throw "dailyActivity not 30" }
  if (-not $r.byWeekday -or $r.byWeekday.Count -ne 7) { throw "byWeekday not 7" }
  $true
}

Test-Step "Analytics summary 7d returns 7-day daily" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/analytics/summary?range=7d" -Headers $hdr
  if ($r.dailyActivity.Count -ne 7) { throw "dailyActivity not 7, got $($r.dailyActivity.Count)" }
  $true
}

Test-Step "Analytics with invalid range returns 400" {
  Expect-Status -wantStatus 400 -call { Invoke-RestMethod -Method Get -Uri "$base/analytics/summary?range=junk" -Headers $hdr }
}

# ===========================
# 10. DASHBOARD
# ===========================
Write-Host "`n--- DASHBOARD ---" -ForegroundColor Cyan

Test-Step "Dashboard stats" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/dashboard/stats" -Headers $hdr
  if ($null -eq $r.totalTasks) { throw 'no totalTasks' }
  $true
}

Test-Step "Dashboard calendar for current month" {
  $now = Get-Date
  $url = "$base/dashboard/calendar?year=$($now.Year)" + '&' + "month=$($now.Month)"
  $r = Invoke-RestMethod -Method Get -Uri $url -Headers $hdr
  if ($null -eq $r) { throw 'null response' }
  $true
}

# ===========================
# 11. CROSS-USER ISOLATION
# ===========================
Write-Host "`n--- ISOLATION ---" -ForegroundColor Cyan

$randB = Get-Random -Maximum 999999
$emailB = "testb${randB}@test.local"
$regB = $null

Test-Step "Register second user" {
  $body = @{ email=$emailB; username="b$randB"; password="testpass123" } | ConvertTo-Json
  $script:regB = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -Body $body -ContentType 'application/json'
  $true
}

Test-Step "User B cannot read user A`s task" {
  Expect-Status -wantStatus 403 -call { Invoke-RestMethod -Method Get -Uri "$base/tasks/$($task.id)" -Headers (MakeHeaders $regB.accessToken) }
}

Test-Step "User B cannot delete user A`s project" {
  Expect-Status -wantStatus 403 -call { Invoke-RestMethod -Method Delete -Uri "$base/projects/$($project.id)" -Headers (MakeHeaders $regB.accessToken) }
}

Test-Step "User B`s task list does NOT contain user A`s tasks" {
  $r = Invoke-RestMethod -Method Get -Uri "$base/tasks" -Headers (MakeHeaders $regB.accessToken)
  if ($r | Where-Object { $_.id -eq $task.id }) { throw "leakage: A`s task in B`s list" }
  $true
}

# Summary
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  PASS: $pass    FAIL: $fail" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$results | Out-File -FilePath 'test-results.txt' -Encoding utf8
Write-Host "Results saved to test-results.txt"
