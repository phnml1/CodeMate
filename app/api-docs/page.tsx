"use client"

import SwaggerUI from "swagger-ui-react"
import "swagger-ui-react/swagger-ui.css"

export default function ApiDocsPage() {
  return (
    <section className="container mx-auto py-8">
      <SwaggerUI url="/api/swagger" />
    </section>
  )
}
