param(
    [Parameter(Mandatory = $true)]
    [string]$DocxPath,

    [Parameter(Mandatory = $true)]
    [string]$WatermarkPath,

    [string]$PdfPath = ""
)

$word = $null
$doc = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $doc = $word.Documents.Open($DocxPath)

    for ($index = $doc.Shapes.Count; $index -ge 1; $index--) {
        $shapeToDelete = $doc.Shapes.Item($index)
        if ($shapeToDelete.Name -like "AreliWatermark*") {
            $shapeToDelete.Delete()
        }
    }

    foreach ($section in $doc.Sections) {
        for ($headerIndex = 1; $headerIndex -le 3; $headerIndex++) {
            $header = $section.Headers.Item($headerIndex)
            for ($index = $header.Shapes.Count; $index -ge 1; $index--) {
                $shapeToDelete = $header.Shapes.Item($index)
                if ($shapeToDelete.Name -like "AreliWatermark*") {
                    $shapeToDelete.Delete()
                }
            }
        }
    }

    $pageWidth = $doc.PageSetup.PageWidth
    $pageHeight = $doc.PageSetup.PageHeight
    $shapeWidth = 455
    $shapeHeight = 368
    $left = ($pageWidth - $shapeWidth) / 2
    $top = ($pageHeight - $shapeHeight) / 2
    $pageCount = $doc.ComputeStatistics(2)

    for ($page = 1; $page -le $pageCount; $page++) {
        $anchor = $doc.GoTo(1, 1, $page)
        $shape = $doc.Shapes.AddPicture(
            $WatermarkPath,
            $false,
            $true,
            $left,
            $top,
            $shapeWidth,
            $shapeHeight,
            $anchor
        )

        $shape.Name = "AreliWatermark" + $page
        $shape.LockAspectRatio = -1
        $shape.WrapFormat.Type = 5
        $shape.RelativeHorizontalPosition = 1
        $shape.RelativeVerticalPosition = 1
        $shape.Left = $left
        $shape.Top = $top
        $shape.ZOrder(5)
    }

    $doc.Save()

    if ($PdfPath -ne "") {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PdfPath) | Out-Null
        $doc.SaveAs([ref]$PdfPath, [ref]17)
    }
}
finally {
    if ($doc -ne $null) {
        $doc.Close([ref]$false) | Out-Null
    }
    if ($word -ne $null) {
        $word.Quit() | Out-Null
    }
}

Write-Output $DocxPath
if ($PdfPath -ne "") {
    Write-Output $PdfPath
}
