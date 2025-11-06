#!/usr/bin/env python3
"""Create a test PDF for DevOps Assessment validation"""

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
except ImportError:
    print("reportlab not installed, using fpdf instead")
    from fpdf import FPDF
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=10)
    
    with open('test-devops-assessment.txt', 'r') as f:
        for line in f:
            pdf.cell(0, 5, txt=line.strip(), ln=True)
    
    pdf.output("test-devops-assessment.pdf")
    print("✅ PDF created successfully using fpdf")
    exit(0)

# Using reportlab
c = canvas.Canvas("test-devops-assessment.pdf", pagesize=letter)
width, height = letter

y = height - 1*inch
c.setFont("Helvetica", 10)

with open('test-devops-assessment.txt', 'r') as f:
    for line in f:
        if y < 1*inch:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - 1*inch
        
        c.drawString(0.75*inch, y, line.rstrip()[:95])
        y -= 12

c.save()
print("✅ PDF created successfully using reportlab")
