const Category=require("../../models/categorySchema");





const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 4; 
        const skip = (page - 1) * limit;

       
        const categories = await Category.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

     
        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("categoryInfo", {
            cat:categories, 
            currentPage: page,
            totalPages,
            limit,
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send("Internal Server Error");
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

        
        const trimmedCatName = catName?.trim();
        const trimmedDescription = description?.trim();

       
        if (!trimmedCatName || !trimmedDescription) {
            return res.status(400).json({ message: 'Category name and description are required.' });
        }

        const catNameRegex = /^[A-Za-z][A-Za-z0-9\s]+$/;
        if (!catNameRegex.test(trimmedCatName)) {
            return res.status(400).json({
                message: 'Category name must start with a letter and contain only alphanumeric characters and spaces.',
            });
        }
       
        if (trimmedCatName.startsWith(' ')) {
            return res.status(400).json({
                message: 'Category name cannot start with a space.',
            });
        }

        
        if (trimmedCatName.length > 50) {
            return res.status(400).json({ message: 'Category name cannot exceed 50 characters.' });
        }

        if (trimmedDescription.length > 250) {
            return res.status(400).json({ message: 'Description cannot exceed 250 characters.' });
        }

       
        const existingCategory = await Category.findOne({
            name: { $regex: `^${trimmedCatName}$`, $options: 'i' },
        });

        console.log("Existing Category:", existingCategory);

        if (existingCategory) {
            return res.status(400).json({ message: 'Category with the same name already exists.' });
        }

        
        const newCategory = new Category({
            name: trimmedCatName,
            description: trimmedDescription,
        });

        await newCategory.save();

        return res.status(201).json({ message: `Category "${trimmedCatName}" added successfully.` });
    } catch (error) {
        console.error('Error adding category:', error);
        return res.status(500).json({ message: 'An internal server error occurred.' });
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
        const id = req.query.id; 
        const catData = await Category.findById(id); 

        if (catData) {
            res.render('editCategory', { category: catData }); 
        } else {
            res.redirect('/admin/categoryInfo'); 
        }
    } catch (error) {
        console.error('Error loading edit category page:', error);
        res.redirect('/admin/categoryInfo'); 
    }
};

const editCat = async (req, res) => {
    try {
        const id = req.params.id; 
        const { catName, description } = req.body; 

        
        const trimmedCatName = catName.trim();
        const trimmedDescription = description.trim();

        
        if (!trimmedCatName || !trimmedDescription) {
            return res.status(400).json({ message: 'Fields cannot be empty.' });
        }

      
        const catNameRegex = /^[A-Za-z][A-Za-z0-9\s]*$/;
        if (!catNameRegex.test(trimmedCatName)) {
            return res.status(400).json({ message: 'Invalid category name format.' });
        }

        
        if (trimmedCatName.length > 50 || trimmedDescription.length > 250) {
            return res.status(400).json({ message: 'Exceeded maximum length.' });
        }

        
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmedCatName}$`, 'i') },
            _id: { $ne: id }
        });

        if (existingCategory) {
            return res.status(400).json({ message: 'Category name already exists.' });
        }

        
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name: trimmedCatName, description: trimmedDescription },
            { new: true }
        );

        res.status(200).json({ message: 'Category updated successfully.', updatedCategory });
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).json({ message: 'An error occurred while editing the category.' });
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