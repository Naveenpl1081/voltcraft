const Category=require("../../models/categorySchema");





const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;

        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryDate = await Category.find() 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("categoryInfo", {
            cat: categoryDate,
            currentPage: page,
            totalPages: totalPages,
            categories: totalCategories,
            topCategories: totalCategories,
        });

        console.log(categoryDate);
    } catch (error) {
        console.error(error);
    }
};




const getCategory = (req,res) => {
    try {
        res.render('addCategory');
    } catch (error) {
        console.log(error.message);
    }
}

const addCategory = async (req, res) => {
    try {
        const { catName, description } = req.body;

        // Validate required fields
        if (!catName || !description) {
            return res.status(400).json({ message: 'Category name and description are required.' });
        }

        // Trim and validate input lengths
        const trimmedCatName = catName.trim();
        const trimmedDescription = description.trim();

        // Check if fields are empty or contain only spaces
        if (trimmedCatName.length === 0 || trimmedDescription.length === 0) {
            return res.status(400).json({ message: 'Fields cannot be empty or contain only spaces.' });
        }

        if (trimmedCatName.length > 50) {
            return res.status(400).json({ message: 'Category name cannot exceed 50 characters.' });
        }

        if (trimmedDescription.length > 250) {
            return res.status(400).json({ message: 'Description cannot exceed 250 characters.' });
        }

        // Check if category already exists (case-insensitive)
        const existingCategory = await Category.findOne({
            catName: { $regex: new RegExp(`^${trimmedCatName}$`, 'i') },
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category with the same name already exists.' });
        }

        // Create and save the new category
        const newCategory = new Category({
            name: trimmedCatName,
            description: trimmedDescription,
        });

        await newCategory.save();

        // Respond with success message
        return res.status(201).json({ message: `Category "${trimmedCatName}" added successfully.` });
    } catch (error) {
        console.error('Error in adding category:', error.message);
        return res.status(500).json({ message: 'An error occurred while adding the category.' });
    }
};


const deleteCategory = async (req, res) => {
    const categoryId = req.params.id;

    try {
        
        const result = await Category.findByIdAndUpdate(categoryId, { isDeleted: true });

        if (result) {
            return res.status(200).json({ success: true, message: 'Category soft deleted successfully' });
        } else {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }
    } catch (error) {
        console.error('Error soft deleting category:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const restoreCategory = async (req, res) => {
    const categoryId = req.params.id;

    try {
        const result = await Category.findByIdAndUpdate(categoryId, { isDeleted: false });

        if (result) {
            return res.status(200).json({ success: true, message: "Category restored successfully" });
        } else {
            return res.status(404).json({ success: false, error: "Category not found" });
        }
    } catch (error) {
        console.error("Error restoring category:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};


const editCategory = async (req, res) => {
    try {
      console.log('editing start');
      const id = req.query.id
      console.log(id);
      const catData = await Category.findById({ _id: id })
      console.log(catData);
      if (catData) {
        res.render('editCategory', { category: catData })
      } else {
        res.redirect('/admin/categoryInfo')
      }
  
    } catch (error) {
      console.log('error loading edit cat page');
      console.log(error);
    }
  }


  const editCat = async (req, res) => {
    try {
        console.log("req body", req.body);

        const { id, catName, description } = req.body;

        
        if (!catName || !description || catName.trim().length === 0 || description.trim().length === 0) {
            console.log('Validation failed: Empty fields');
            return res.redirect('/admin/editCategory');
        }

        
        const existingCategory = await Category.findOne({ 
            catName: { $regex: new RegExp(`^${catName}$`, 'i') }, 
            _id: { $ne: id }
        });

        if (existingCategory) {
            console.log('Category name already exists');
            return res.redirect('/admin/editCategory');
        }

        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: catName, description: description },
            { new: true }
        );

        console.log('Category updated:', updatedCategory);

        
        return res.redirect('/admin/categoryInfo');
    } catch (error) {
        console.error('Error editing category:', error);
        res.redirect('/admin/editCategory');
    }
};






module.exports={
    categoryInfo,
    addCategory,
    getCategory,
    deleteCategory,
    restoreCategory,
    editCategory,
    editCat,
   

}