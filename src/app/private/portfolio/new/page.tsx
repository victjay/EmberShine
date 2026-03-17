import PortfolioPostForm from '../PortfolioPostForm'
import { createProject } from '../actions'

export default function NewProjectPage() {
  return (
    <PortfolioPostForm
      action={createProject}
      pageLabel="New project"
      submitLabel="Save Project"
    />
  )
}
