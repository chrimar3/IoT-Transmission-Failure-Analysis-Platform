import { render, screen } from '@testing-library/react'
import HomePage from '../page'

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />)
    
    const heading = screen.getByRole('heading', {
      name: /cu-bems iot platform/i,
    })
    
    expect(heading).toBeInTheDocument()
  })

  it('displays Bangkok dataset information', () => {
    render(<HomePage />)
    
    expect(screen.getByText('134')).toBeInTheDocument()
    expect(screen.getByText('4.6M+')).toBeInTheDocument()
    expect(screen.getByText('18 Months')).toBeInTheDocument()
  })

  it('renders the dataset analysis section', () => {
    render(<HomePage />)
    
    const analysisHeading = screen.getByRole('heading', {
      name: /bangkok dataset analysis/i,
    })
    
    expect(analysisHeading).toBeInTheDocument()
  })
})