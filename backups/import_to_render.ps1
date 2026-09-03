param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseId,
  [Parameter(Mandatory = $false)]
  [string]$SqlPath = "backups/subZero_render_inserts.sql"
)

$ErrorActionPreference = "Stop"

$env:Path = "C:\Program Files\PostgreSQL\18\bin;" + $env:Path

if (-not (Test-Path $SqlPath)) {
  throw "SQL file not found: $SqlPath"
}

function Split-SqlStatements {
  param([string]$RawSql)

  $statements = New-Object System.Collections.Generic.List[string]
  $sb = New-Object System.Text.StringBuilder
  $inSingle = $false
  $inDollar = $false
  $dollarTag = ""
  $i = 0

  while ($i -lt $RawSql.Length) {
    $ch = $RawSql[$i]

    if (-not $inSingle -and -not $inDollar -and $ch -eq '$') {
      $slice = $RawSql.Substring($i)
      $m = [regex]::Match($slice, '^\$[A-Za-z0-9_]*\$')
      if ($m.Success) {
        $tag = $m.Value
        [void]$sb.Append($tag)
        $i += $tag.Length
        $inDollar = $true
        $dollarTag = $tag
        continue
      }
    }

    if ($inDollar) {
      $remaining = $RawSql.Length - $i
      if ($remaining -ge $dollarTag.Length) {
        $piece = $RawSql.Substring($i, $dollarTag.Length)
        if ($piece -eq $dollarTag) {
          [void]$sb.Append($dollarTag)
          $i += $dollarTag.Length
          $inDollar = $false
          $dollarTag = ""
          continue
        }
      }
      [void]$sb.Append($ch)
      $i++
      continue
    }

    if ($ch -eq "'") {
      if ($inSingle) {
        if (($i + 1) -lt $RawSql.Length -and $RawSql[$i + 1] -eq "'") {
          [void]$sb.Append("''")
          $i += 2
          continue
        }
        $inSingle = $false
        [void]$sb.Append($ch)
        $i++
        continue
      }
      $inSingle = $true
      [void]$sb.Append($ch)
      $i++
      continue
    }

    if ($ch -eq ';' -and -not $inSingle) {
      [void]$sb.Append($ch)
      $stmt = $sb.ToString().Trim()
      $sb.Clear() | Out-Null
      if ($stmt) {
        $statements.Add($stmt)
      }
      $i++
      continue
    }

    [void]$sb.Append($ch)
    $i++
  }

  $tail = $sb.ToString().Trim()
  if ($tail) {
    $statements.Add($tail)
  }

  return $statements
}

$raw = Get-Content -Path $SqlPath -Raw
$raw = [regex]::Replace($raw, '(?m)^\s*\\.*\r?\n', '')
$statements = Split-SqlStatements -RawSql $raw

Write-Output "Parsed statements: $($statements.Count)"
if ($statements.Count -eq 0) {
  throw "No SQL statements found after parsing."
}

render psql $DatabaseId -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" -o text | Out-Null

$count = 0
foreach ($statement in $statements) {
  $trimmed = $statement.Trim()
  if (-not $trimmed) { continue }
  if ($trimmed.StartsWith("--")) { continue }

  render psql $DatabaseId -c $statement -o text | Out-Null
  $count++
  if (($count % 25) -eq 0) {
    Write-Output "Executed statements: $count / $($statements.Count)"
  }
}

Write-Output "Import finished. Executed statements: $count"
